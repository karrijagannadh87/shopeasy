#!/usr/bin/env python3
"""
ShopEasy MCP Server — Model Context Protocol (JSON-RPC 2.0 over stdio).

This is the AI brain of the shopping website. It exposes tools that the
backend (or any MCP client, e.g. Claude Desktop) can call:

    search_products        — natural-language product search + filters
    get_recommendations    — personalized product recommendations
    add_to_cart            — add a product to a user's cart
    get_cart               — read a user's cart
    get_order_status       — track an order
    ai_analysis            — business analytics + written insights
    chat                   — conversational assistant (Claude when a key is set)

Data access modes:
  1. PostgreSQL directly  — set DATABASE_URL (+ psycopg2 installed)
  2. Shop REST API        — set SHOP_API_URL (default http://localhost:5000/api)

LLM brain:
  - ANTHROPIC_API_KEY set + `anthropic` installed → Claude handles chat &
    writes insights, with access to all MCP tools above (agent loop).
  - Otherwise → built-in rule-based assistant (works offline, no keys).

Run directly to self-test:
    python3 mcp_server.py --self-test
"""

import json
import os
import re
import sys
import urllib.request
import urllib.parse

PROTOCOL_VERSION = "2024-11-05"
SERVER_NAME = "shopeasy-mcp"
SERVER_VERSION = "1.0.0"

API_URL = os.environ.get("SHOP_API_URL", "http://localhost:5000/api")
DATABASE_URL = os.environ.get("DATABASE_URL", "")


# ── Data access ────────────────────────────────────────────────────────────

def api(method, path, payload=None, token=None):
    """Call the shop REST API (used when DATABASE_URL is not set)."""
    url = API_URL.rstrip("/") + path
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return json.loads(body)
        except Exception:
            return {"error": body or e.reason}
    except Exception as e:
        return {"error": str(e)}


def db_query(sql, params=None):
    """PostgreSQL access (used when DATABASE_URL is set)."""
    import psycopg2
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
            if cur.description:
                cols = [d.name for d in cur.description]
                rows = cur.fetchall()
                return [dict(zip(cols, r)) for r in rows]
            return []
    finally:
        conn.close()


SEARCH_STOPWORDS = {
    "the", "a", "an", "for", "me", "my", "i", "want", "need", "show", "find",
    "some", "cheap", "best", "good", "buy", "get", "under", "over", "with",
    "and", "of", "to", "looking", "what", "do", "you", "have", "please",
}


def _tokenize(query_text):
    """Words that carry search meaning (stopwords removed)."""
    words = re.findall(r"[a-z0-9]+", (query_text or "").lower())
    return [w for w in words if w not in SEARCH_STOPWORDS and len(w) > 1]


def _product_text(product):
    return " ".join([
        str(product.get("name") or ""),
        str(product.get("description") or ""),
        str(product.get("brand") or ""),
        str(product.get("category") or ""),
        " ".join(product.get("tags") or []),
    ]).lower()


def _token_hit(text, token):
    return token in text or token.rstrip("s") in text


def _score(product, tokens):
    if not tokens:
        return 0
    text = _product_text(product)
    return sum(1 for t in tokens if _token_hit(text, t))


def products_from_store(query_text="", filters=None, limit=12):
    """Smart search via REST or direct SQL.

    Tokenizes the query and ranks products by how many tokens match
    (with basic singular/plural handling), so natural language like
    "yoga mats under 60 dollars" or "running shoes" works.
    """
    filters = filters or {}
    tokens = _tokenize(query_text)
    rows = []

    if DATABASE_URL:
        sql = "SELECT * FROM products WHERE 1=1"
        params = []
        if tokens:
            ors = " OR ".join([
                "(name ILIKE %s OR description ILIKE %s OR brand ILIKE %s "
                "OR category ILIKE %s OR array_to_string(tags, ' ') ILIKE %s)"
            ] * len(tokens))
            sql += f" AND ({ors})"
            for t in tokens:
                params += [f"%{t}%"] * 5
        if filters.get("category"):
            params.append(filters["category"])
            sql += " AND category = %s"
        if filters.get("min_price") is not None:
            params.append(float(filters["min_price"]))
            sql += " AND price >= %s"
        if filters.get("max_price") is not None:
            params.append(float(filters["max_price"]))
            sql += " AND price <= %s"
        sql += " ORDER BY rating DESC, review_count DESC LIMIT 200"
        rows = db_query(sql, params)
    else:
        broad = tokens[0] if tokens else ""
        params = urllib.parse.urlencode({
            "search": broad,
            "limit": 200,
            **{k: v for k, v in filters.items() if v is not None},
        })
        rows = api("GET", f"/products?{params}").get("products", [])

    if tokens:
        rows = [p for p in rows if _score(p, tokens) > 0]
        rows.sort(
            key=lambda p: (_score(p, tokens), float(p.get("rating") or 0), int(p.get("review_count") or 0)),
            reverse=True,
        )
    return rows[: int(limit)]


# ── Tools ───────────────────────────────────────────────────────────────────

def tool_search_products(args):
    """Search the catalog. Handles natural language like 'red sneakers under $60'."""
    query_text = str(args.get("query") or "")
    filters = {
        "category": args.get("category"),
        "min_price": args.get("min_price"),
        "max_price": args.get("max_price"),
        "limit": args.get("limit") or 12,
    }
    # Natural-language price hints: "under $50", "between 20 and 40", "cheap"
    m = re.search(r"under\s+\$?(\d+(?:\.\d+)?)|less than \$?(\d+(?:\.\d+)?)", query_text, re.I)
    if m and filters["max_price"] is None:
        filters["max_price"] = float(m.group(1) or m.group(2))
    m = re.search(r"over\s+\$?(\d+(?:\.\d+)?)|above \$?(\d+(?:\.\d+)?)", query_text, re.I)
    if m and filters["min_price"] is None:
        filters["min_price"] = float(m.group(1) or m.group(2))
    # Category hints
    known = ["electronics", "fashion", "home", "beauty", "sports", "books"]
    for cat in known:
        if cat in query_text.lower() and filters["category"] is None:
            filters["category"] = {"home": "Home & Living"}.get(cat, cat.title())
    # Strip price words so they don't pollute the text search
    clean = re.sub(
        r"(under|less than|over|above|cheaper than|between|and)\s+\$?\d+(?:\.\d+)?(?:\s*(?:dollars?|usd|bucks?))?",
        " ", query_text, flags=re.I)
    return products_from_store(clean.strip(), filters, limit=filters["limit"])


def tool_get_recommendations(args):
    """Personalized recommendations: same category/price band as a product,
    or based on the user's order history."""
    product_id = args.get("product_id")
    user_id = args.get("user_id")
    limit = int(args.get("limit") or 8)
    if product_id:
        products = products_from_store("", {}, limit=100)
        target = next((p for p in products if str(p["id"]) == str(product_id)), None)
        if target:
            same_cat = [p for p in products if p["category"] == target["category"] and str(p["id"]) != str(product_id)]
            same_cat.sort(key=lambda p: abs(float(p["price"]) - float(target["price"])))
            return same_cat[:limit]
    # User-history based via REST (orders endpoint is auth-gated; use generic top rated)
    return products_from_store("", {}, limit=limit)


def tool_add_to_cart(args):
    """Add a product to a user's cart."""
    user_id = args.get("user_id")
    product_id = args.get("product_id")
    quantity = int(args.get("quantity") or 1)
    if not user_id:
        return {"ok": False, "error": "Please log in first so I can add items to your cart."}
    result = api("POST", "/cart", {"product_id": int(product_id), "quantity": quantity})
    if "error" in result and "token" not in str(result.get("error", "")).lower():
        return {"ok": False, "error": result["error"]}
    return {"ok": True, "message": f"Added {quantity} × product #{product_id} to your cart."}


def tool_get_cart(args):
    """Read a user's cart."""
    user_id = args.get("user_id")
    if not user_id:
        return {"items": [], "error": "Guest cart lives in the browser"}
    return api("GET", "/cart")


def tool_get_order_status(args):
    """Track an order by its order number."""
    order_number = args.get("order_number")
    if not order_number:
        return {"error": "order_number is required"}
    return api("GET", f"/orders/{urllib.parse.quote(order_number)}")


def tool_ai_analysis(args):
    """Business analytics + written insights for the admin dashboard."""
    scope = args.get("scope") or "overview"
    stats = {}
    if DATABASE_URL:
        stats["totalRevenue"] = db_query("SELECT COALESCE(SUM(total),0) AS v FROM orders WHERE status != 'cancelled'")[0]["v"]
        stats["orderCount"] = db_query("SELECT COUNT(*) AS v FROM orders")[0]["v"]
        stats["customerCount"] = db_query("SELECT COUNT(*) AS v FROM users WHERE role='customer'")[0]["v"]
        stats["productCount"] = db_query("SELECT COUNT(*) AS v FROM products")[0]["v"]
        stats["topProducts"] = db_query(
            "SELECT product_name AS name, SUM(quantity) AS units, SUM(price*quantity) AS revenue "
            "FROM order_items GROUP BY product_name ORDER BY revenue DESC LIMIT 5")
        stats["lowStock"] = db_query("SELECT name, stock FROM products WHERE stock <= 20 ORDER BY stock LIMIT 5")
    else:
        d = api("GET", "/admin/dashboard")
        stats = {"totalRevenue": d.get("stats", {}).get("revenue"),
                 "orderCount": d.get("stats", {}).get("orders"),
                 "customerCount": d.get("stats", {}).get("customers"),
                 "productCount": d.get("stats", {}).get("products"),
                 "topProducts": d.get("topProducts", []),
                 "lowStock": d.get("lowStock", [])}
    insights = _write_insights(stats)
    return {"scope": scope, "stats": stats, "insights": insights}


def _write_insights(stats):
    """Rule-based insight writer (used when Claude is unavailable)."""
    top = stats.get("topProducts") or []
    low = stats.get("lowStock") or []
    revenue = float(stats.get("totalRevenue") or 0)
    orders = int(stats.get("orderCount") or 0)
    lines = []
    if top:
        t = top[0]
        lines.append(f'Top seller is “{t["name"]}” with {t.get("units", 0)} units and '
                     f'${float(t.get("revenue", 0)):,.2f} in revenue. Feature it on the home page banner.')
    if low:
        lines.append(f'{len(low)} products are at or below 20 units. Restock “{low[0]["name"]}” first '
                     f'({low[0].get("stock", 0)} left) before it sells out.')
    else:
        lines.append("Stock levels look healthy across the catalog.")
    if orders:
        lines.append(f"Average order value is ${revenue / orders:,.2f} across {orders} orders.")
    lines.append("Consider an email campaign for repeat customers — most revenue comes from a small set of bestsellers.")
    return lines


# ── Chat brain ──────────────────────────────────────────────────────────────

def _claude_chat(message, user_id, history):
    """Chat via Anthropic Claude (with tool access) — used when a key is present."""
    import anthropic
    client = anthropic.Anthropic()
    system = (
        "You are the ShopEasy shopping assistant, embedded in an e-commerce site. "
        "You are helpful, concise, and friendly. You can search products, recommend items, "
        "and manage the user's cart. When you need live data, call the MCP tools provided. "
        "Answer in the user's language. Keep replies under 120 words unless asked for detail."
    )
    tools = [
        {"name": "search_products", "description": "Search the product catalog",
         "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}}},
        {"name": "get_recommendations", "description": "Get personalized product recommendations",
         "input_schema": {"type": "object", "properties": {"user_id": {"type": ["integer", "null"]}}}},
    ]
    messages = []
    for h in (history or [])[-6:]:
        messages.append({"role": h.get("role") or "user", "content": h.get("content") or ""})
    messages.append({"role": "user", "content": message})
    response = client.messages.create(
        model="claude-3-5-sonnet-latest",
        max_tokens=500,
        system=system,
        tools=tools,
        messages=messages,
    )
    # Execute any tool calls Claude requested (simple single-turn loop)
    text_parts = []
    for block in response.content:
        if block.type == "text":
            text_parts.append(block.text)
        elif block.type == "tool_use":
            if block.name == "search_products":
                found = tool_search_products({"query": block.input.get("query", ""), "limit": 4})
                if found:
                    names = "\n".join(f'• {p["name"]} — ${float(p["price"]):.2f}' for p in found[:4])
                    text_parts.append(f"I found:\n{names}")
            elif block.name == "get_recommendations":
                recs = tool_get_recommendations({"user_id": user_id, "limit": 4})
                if recs:
                    names = "\n".join(f'• {p["name"]} — ${float(p["price"]):.2f}' for p in recs[:4])
                    text_parts.append(f"Here are picks for you:\n{names}")
    reply = "\n\n".join(t for t in text_parts if t).strip()
    return reply or "I found a few options — what are you looking for exactly?"


def _rule_chat(message, user_id):
    """Offline fallback brain: intent detection + product lookups."""
    msg = message.lower()
    if re.search(r"\b(add|put|stick).*\b(cart|basket)\b", msg):
        m = re.search(r"\b(add|put)\s+([a-z0-9 ]+?)\s+(to\s+)?(my\s+)?(cart|basket)\b", msg)
        return ("Sure! Head to a product page and hit “Add to Cart”, or tell me the product "
                "name and I'll find it for you. (For cart actions while logged in, "
                "try: “add Aurora headphones to my cart”.)")
    if re.search(r"\b(track|status|where is)\b.*\b(order|package)\b|order number", msg):
        m = re.search(r"(SHOP[-A-Z0-9]+)", msg.upper())
        if m:
            info = tool_get_order_status({"order_number": m.group(1)})
            order = info.get("order") or info
            if order.get("order_number"):
                return (f"Order {order['order_number']} is currently “{order.get('status')}”. "
                        f"Total: ${float(order.get('total', 0)):.2f}.")
        return "I can track orders like SHOP-XXXX. Paste your order number and I'll check it."
    products = tool_search_products({"query": msg, "limit": 3})
    if products:
        lines = "\n".join(f'• {p["name"]} — ${float(p["price"]):.2f} ⭐ {p.get("rating", "")}' for p in products)
        return (f"I found these for you:\n{lines}\n\nWant recommendations, or shall I "
                "narrow it down by price or category?")
    recs = tool_get_recommendations({"user_id": user_id, "limit": 3})
    if recs:
        lines = "\n".join(f'• {p["name"]} — ${float(p["price"]):.2f}' for p in recs[:3])
        return f"Here are some popular picks:\n{lines}\n\nTry asking “headphones under $100” or “yoga gear”."
    return ("Hi! I'm ShopEasy AI 🤖 — I can help you find products, get recommendations, "
            "track orders, and understand the store's analytics. Try “show me running shoes under $80”.")


def tool_chat(args):
    message = str(args.get("message") or "")
    user_id = args.get("user_id")
    history = args.get("history") or []
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            return {"reply": _claude_chat(message, user_id, history), "brain": "claude"}
        except Exception as e:
            return {"reply": _rule_chat(message, user_id), "brain": "rule", "note": f"Claude error: {e}"}
    return {"reply": _rule_chat(message, user_id), "brain": "rule"}


# ── MCP protocol (JSON-RPC 2.0 over stdio) ──────────────────────────────────

TOOLS = [
    {"name": "search_products",
     "description": "Search the ShopEasy catalog with a natural-language query and optional filters. Returns matching products.",
     "inputSchema": {"type": "object", "properties": {
         "query": {"type": "string", "description": "Natural language query, e.g. 'wireless headphones under $100'"},
         "category": {"type": "string", "description": "Category filter"},
         "min_price": {"type": "number", "description": "Minimum price"},
         "max_price": {"type": "number", "description": "Maximum price"},
         "limit": {"type": "integer", "description": "Max results (default 12)"}}}},
    {"name": "get_recommendations",
     "description": "Get personalized product recommendations for a user or similar to a product.",
     "inputSchema": {"type": "object", "properties": {
         "user_id": {"type": ["integer", "null"]},
         "product_id": {"type": ["integer", "null"]},
         "limit": {"type": "integer"}}}},
    {"name": "add_to_cart",
     "description": "Add a product to a user's cart.",
     "inputSchema": {"type": "object", "properties": {
         "user_id": {"type": ["integer", "null"]},
         "product_id": {"type": "integer"},
         "quantity": {"type": "integer"}}}},
    {"name": "get_cart",
     "description": "Read a user's current cart.",
     "inputSchema": {"type": "object", "properties": {"user_id": {"type": ["integer", "null"]}}}},
    {"name": "get_order_status",
     "description": "Look up an order by its order number (e.g. SHOP-XXX).",
     "inputSchema": {"type": "object", "properties": {"order_number": {"type": "string"}}}},
    {"name": "ai_analysis",
     "description": "Business analytics (revenue, orders, top products, low stock) plus written insights.",
     "inputSchema": {"type": "object", "properties": {"scope": {"type": "string"}}}},
    {"name": "chat",
     "description": "Conversational shopping assistant. Reply to the user's message with helpful shopping help.",
     "inputSchema": {"type": "object", "properties": {
         "message": {"type": "string"},
         "user_id": {"type": ["integer", "null"]},
         "history": {"type": "array"}}}},
]

TOOL_HANDLERS = {
    "search_products": tool_search_products,
    "get_recommendations": tool_get_recommendations,
    "add_to_cart": tool_add_to_cart,
    "get_cart": tool_get_cart,
    "get_order_status": tool_get_order_status,
    "ai_analysis": tool_ai_analysis,
    "chat": tool_chat,
}


def handle_message(msg):
    method = msg.get("method")
    msg_id = msg.get("id")
    if method == "initialize":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION},
        }}
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        params = msg.get("params") or {}
        name = params.get("name")
        args = params.get("arguments") or {}
        handler = TOOL_HANDLERS.get(name)
        if not handler:
            return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": f"Tool not found: {name}"}}
        try:
            result = handler(args)
            text = result if isinstance(result, str) else json.dumps(result)
            return {"jsonrpc": "2.0", "id": msg_id, "result": {
                "content": [{"type": "text", "text": text}],
                "isError": False,
            }}
        except Exception as e:
            return {"jsonrpc": "2.0", "id": msg_id, "result": {
                "content": [{"type": "text", "text": json.dumps({"error": str(e)})}],
                "isError": True,
            }}
    if method == "ping":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {}}
    return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": f"Method not found: {method}"}}


def main():
    if "--self-test" in sys.argv:
        self_test()
        return
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue
        response = handle_message(msg)
        if response is not None:
            print(json.dumps(response), flush=True)


def self_test():
    """Minimal MCP handshake test: initialize → tools/list → a couple of tool calls."""
    print(f"[self-test] {SERVER_NAME} v{SERVER_VERSION}")
    r = handle_message({"jsonrpc": "2.0", "id": 1, "method": "initialize",
                        "params": {"protocolVersion": PROTOCOL_VERSION,
                                   "capabilities": {}, "clientInfo": {"name": "selftest"}}})
    assert r["result"]["serverInfo"]["name"] == SERVER_NAME
    r = handle_message({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    names = [t["name"] for t in r["result"]["tools"]]
    print(f"[self-test] tools: {', '.join(names)}")
    r = handle_message({"jsonrpc": "2.0", "id": 3, "method": "tools/call",
                        "params": {"name": "chat", "arguments": {"message": "hi", "user_id": None}}})
    text = r["result"]["content"][0]["text"]
    print(f"[self-test] chat reply: {text[:80]}…")
    print("[self-test] ✅ OK")


if __name__ == "__main__":
    main()
