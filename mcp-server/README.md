# 🤖 ShopEasy MCP Server

The AI brain of the shopping website. A **Model Context Protocol** server
(JSON-RPC 2.0 over stdio) written in pure Python — it can be driven by the
ShopEasy Node.js backend, or by any MCP client such as Claude Desktop.

## Tools

| Tool                  | What it does                                                        |
| --------------------- | ------------------------------------------------------------------- |
| `search_products`     | Natural-language search: `"wireless headphones under $100"`          |
| `get_recommendations` | Personalized picks (similar product / user history)                  |
| `add_to_cart`         | Add a product to a user's cart                                       |
| `get_cart`            | Read a user's cart                                                   |
| `get_order_status`    | Track an order by number (SHOP-…)                                    |
| `ai_analysis`         | Analytics + written insights for the admin dashboard                 |
| `chat`                | Conversational assistant (Claude agent when a key is set)            |

## Modes

| Mode | Config | Notes |
| ---- | ------ | ----- |
| Demo | `SHOP_API_URL=http://localhost:5000/api` (default) | Talks to the Node API |
| Production | `DATABASE_URL=postgres://…` (+ `pip install psycopg2-binary`) | Talks to PostgreSQL directly |
| Claude brain | `ANTHROPIC_API_KEY=sk-…` (+ `pip install anthropic`) | Chat + insights written by Claude |
| Offline brain | — | Built-in rule-based assistant, no keys needed |

## Run

```bash
# Self-test
python3 mcp_server.py --self-test

# As a stdio MCP server (spawned automatically by the Node backend)
python3 mcp_server.py

# Point it at your own Postgres + Claude
DATABASE_URL=postgres://user:pass@host:5432/shopeasy \
ANTHROPIC_API_KEY=sk-ant-... \
python3 mcp_server.py
```

## Test with a generic MCP client

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_products","arguments":{"query":"sneakers under 100"}}}' \
  | python3 mcp_server.py
```
