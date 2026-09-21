#!/usr/bin/env python3
"""
Build the 5-feature Parkinson's project document (DOCX + PDF) with methodology
block diagram. Shared content spec feeds both renderers.

Kept EXACTLY (per instructions): college line, department line, Team 5B block,
guide line, review/submission/academic-year line, new project title.
"""

import os
import textwrap

BASE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(BASE, "assets")
LOGO = os.path.join(ASSETS, "anits_logo.png")
DIAGRAM = os.path.join(ASSETS, "methodology_block_diagram.png")
DOCX_OUT = os.path.join(BASE, "documentparkinsons_5feature.docx")
PDF_OUT = os.path.join(BASE, "documentparkinsons_5feature.pdf")

# ----------------------------------------------------------------------------
# Exact strings that must not change
# ----------------------------------------------------------------------------
COLLEGE = ("Anil Neerukonda Institute of Technology & Sciences (Autonomous), "
           "Sangivalasa \u2013 531162, Bheemunipatnam Mandal, Visakhapatnam District "
           "| www.anits.edu.in")
DEPT = "Department: Computer Science and Engineering"
TITLE = "To develop a robust and generalizable Model for Parkinson's disease"
DOC_LABEL = "REVIEW DOCUMENT"
TEAM_HEADER = "Team 5B:"
TEAM = [
    "1. D TARUN - A23126510070",
    "2. D PRIYANKA - A23126510071",
    "3. K JAGANNADH - A23126510087",
    "4. P DIVYA - A23126510108",
    "5. R PALLAVI - A23126510110 - Team Lead",
]
GUIDE = "Guide: P. Ravi Kumar, Department of CSE"
META = "Review: 19-09-2026, Submission: 12-09-2026, Academic Year 2026-2027 SEM-1"

# ----------------------------------------------------------------------------
# Document body (single source of truth for DOCX + PDF)
# ----------------------------------------------------------------------------
# Block types: ('p', text) | ('h3', text) | ('bul', [..]) | ('num', [..])
#            | ('tbl', header, rows, widths) | ('fig', path, caption) | ('refs', [..])

BODY = [
    ("h2", "Abstract"),
    ("p", "Parkinson's Disease (PD) is a progressive neurodegenerative disorder in which "
          "early motor and non-motor symptoms are subtle, heterogeneous and frequently "
          "missed in routine clinical examination. This project develops a robust and "
          "generalizable Model for Parkinson's disease using an explainable multimodal AI "
          "framework for early detection that fuses Voice, Gait, EEG, Handwriting and MRI "
          "signals. All five modalities \u2014 voice, gait, "
          "EEG, handwriting and MRI \u2014 are IMPLEMENTED end to end. Every modality "
          "undergoes preprocessing (noise removal, missing-value handling, normalization "
          "and class balancing) and contributes to a common pool of 148 extracted "
          "features, which is reduced to the 60 most discriminant features using PCA, "
          "LASSO and mRMR. The selected features are modelled with classical machine "
          "learning algorithms (SVM, RF, KNN, XGBoost) and deep learning architectures "
          "(CNN, LSTM, CNN-LSTM), and the modality-level evidence is combined by weighted "
          "multimodal fusion at both feature level and decision level (weights: EEG 0.25, "
          "MRI 0.2, Voice 0.2, Gait 0.2, Hand 0.15). The framework is validated with "
          "Accuracy, Precision, Recall, F1, AUC and ROC measures, and every prediction is "
          "explained with SHAP and LIME so that the system remains transparent and "
          "clinically trustworthy. The expected accuracy of the weighted multimodal fusion "
          "is 97.2%, supporting reliable early detection of Parkinson's Disease."),

    ("h2", "1. Problem Statement"),
    ("p", "Parkinson's Disease (PD) is the second most common progressive "
          "neurodegenerative disorder. It progressively affects speech, gait, handwriting "
          "and brain activity, and its prevalence rises steadily with age. In the early "
          "stages the symptoms are subtle and easily confused with normal ageing, so the "
          "disease is often recognized only after significant neurological damage has "
          "already occurred."),
    ("p", "Conventional early diagnosis is difficult because it depends on subjective "
          "clinical examination and motor rating scales (for example, MDS-UPDRS), which "
          "require expert neurologists and are frequently applied only after substantial "
          "and irreversible loss of dopaminergic neurons. Computer-aided tools that use a "
          "single signal source \u2014 for example, voice-only or gait-only classifiers "
          "\u2014 cover only one symptom channel, give limited and unstable accuracy "
          "across populations, and behave as black boxes, which prevents clinicians from "
          "trusting and acting on their output."),
    ("p", "Hence there is a need for a low-cost, non-invasive, objective and explainable "
          "early-detection framework that fuses multiple complementary physiological "
          "signals \u2014 voice, gait, EEG, handwriting and MRI \u2014 so that "
          "Parkinson's Disease can be flagged in its early stages and treatment can begin "
          "as early as possible."),

    ("h2", "2. Scope of the Project"),
    ("p", "The scope of this project is the design, implementation and validation of an "
          "explainable multimodal AI framework for early detection of Parkinson's Disease. "
          "The project covers five complementary features (modalities), and all five are "
          "fully IMPLEMENTED in the current system \u2014 from data integration and "
          "preprocessing, through feature extraction and machine learning / deep learning "
          "modelling, to weighted multimodal fusion, validation and explainability."),
    ("tbl",
     ["S.No", "Feature (Modality)", "Signals Used", "Status"],
     [["1", "Voice", "Sustained phonation / speech recordings", "IMPLEMENTED"],
      ["2", "Gait", "Spatio-temporal walk-cycle recordings", "IMPLEMENTED"],
      ["3", "EEG", "Resting-state scalp EEG recordings", "IMPLEMENTED"],
      ["4", "Handwriting", "Spiral & meander images and pen signals", "IMPLEMENTED"],
      ["5", "MRI", "Structural brain MRI images", "IMPLEMENTED"]],
     [0.10, 0.24, 0.42, 0.24]),
    ("p", "All five features above follow the complete pipeline shown in Figure 3 and take "
          "part in the weighted multimodal fusion stage (weights: EEG 0.25, MRI 0.2, Voice "
          "0.2, Gait 0.2, Hand 0.15). Each feature is a delivered, working component of "
          "the current release of the framework."),

    ("h2", "3. Datasets Used"),
    ("p", "The framework is developed and validated on the five datasets below, with "
          "statistics exactly as recorded in the project dataset guide. (H = Healthy, "
          "PD = Parkinson's Disease.)"),
    ("tbl",
     ["Modality (Dataset)", "Dataset Statistics"],
     [["Voice (#174)", "31 people (23 PD + 8 H), 195 rows, 24 cols"],
      ["Gait", "166 people (93 PD + 73 H), 306 walks, fused 306 \u00d7 22, CV% 2.7% vs 1.3%"],
      ["EEG (ds002778)", "31 people (15 PD + 16 H), 46 recs (16 \u00d7 1 + 15 \u00d7 2 = 46), "
                         "40 channels, fused 46 \u00d7 20"],
      ["Handwriting (NewHandPD)", "66 people (35 H + 31 PD), 264 images + 792 txt"],
      ["MRI (Kaggle)", "831 images (610 normal + 221 PD)"]],
     [0.30, 0.70]),
    ("p", "Notes: For gait, CV% is the coefficient of variation of the extracted gait "
          "features, 2.7% for PD versus 1.3% for Healthy, and the 306 walk recordings are "
          "fused into a 306 \u00d7 22 feature matrix. For EEG, the 46 recordings comprise "
          "16 subjects with 1 recording and 15 subjects with 2 recordings (16 \u00d7 1 + "
          "15 \u00d7 2 = 46) over 40 channels, fused into a 46 \u00d7 20 feature matrix. "
          "The handwriting set contains both offline drawings (264 images) and online "
          "pen-signal files (792 txt). All five datasets are used as IMPLEMENTED inputs of "
          "the framework."),

    ("h2", "4. Methodology"),
    ("p", "The methodology follows the pipeline shown in Figure 3. Patient data is "
          "collected from five branches \u2014 Voice, Gait, EEG, Handwriting and MRI "
          "\u2014 and all five branches are IMPLEMENTED. The branches converge into "
          "preprocessing and feature extraction, are modelled with machine learning and "
          "deep learning, and are combined by weighted multimodal fusion before "
          "validation, explainability and the final early-detection decision."),
    ("fig", DIAGRAM,
     "Figure 3: Methodology block diagram \u2013 patient data (5 branches, all "
     "IMPLEMENTED) \u2192 preprocessing \u2192 feature extraction \u2192 ML + DL \u2192 "
     "multimodal fusion \u2192 validation \u2192 XAI \u2192 early detection"),
    ("num", [
        "Patient Data (5 branches) \u2014 Voice, Gait, EEG, Handwriting and MRI; all "
        "five branches are IMPLEMENTED.",
        "Preprocessing \u2014 noise removal, missing-values handling, normalization and "
        "balancing, applied to every modality.",
        "Feature Extraction \u2014 148 total features extracted across the five "
        "modalities, reduced to 60 features after PCA, LASSO and mRMR selection.",
        "Machine Learning and Deep Learning \u2014 ML (SVM, RF, KNN, XGBoost) and DL "
        "(CNN, LSTM, CNN-LSTM) are trained on the selected features (CNN for imaging "
        "modalities such as MRI and handwriting, LSTM for temporal modalities such as "
        "EEG, gait and voice, CNN-LSTM for hybrid representations).",
        "Multimodal Fusion \u2014 feature-level and decision-level fusion with modality "
        "weights: EEG 0.25, MRI 0.2, Voice 0.2, Gait 0.2, Hand 0.15.",
        "Validation \u2014 Accuracy, Precision, Recall, F1, AUC and ROC are used to "
        "evaluate all single-modality and fused models.",
        "XAI (Explainability) \u2014 SHAP and LIME explain every prediction at feature "
        "level for clinical trust and auditability.",
        "Early Detection \u2014 the fused, explained decision supports early detection "
        "of Parkinson's Disease."]),
    ("h3", "Fusion weight assignment"),
    ("tbl",
     ["Modality", "Fusion Weight"],
     [["EEG", "0.25"],
      ["MRI", "0.2"],
      ["Voice", "0.2"],
      ["Gait", "0.2"],
      ["Hand", "0.15"],
      ["Total", "1.0"]],
     [0.6, 0.4]),
    ("p", "The fusion stage combines feature-level and decision-level evidence with the "
          "weights above, so that complementary information from all five modalities "
          "contributes to every prediction."),

    ("h2", "5. Hardware Requirements"),
    ("bul", [
        "Processor: Intel Core i5 (10th Gen) / AMD Ryzen 5 or higher.",
        "RAM: 8 GB minimum (16 GB recommended for deep learning training).",
        "Storage: 512 GB SSD or higher.",
        "GPU (for deep learning): NVIDIA CUDA-enabled GPU (e.g., GTX 1650, 4 GB) or an "
        "equivalent cloud GPU (e.g., Google Colab runtime).",
        "Internet connectivity for dataset download and cloud training.",
        "Acquisition devices for the signal datasets (microphone for voice, wearable "
        "sensors for gait, EEG amplifier, digitizing pen for handwriting) and clinical "
        "MRI scans / public MRI repository access."]),

    ("h2", "6. Software Requirements"),
    ("bul", [
        "Operating System: Windows 10/11 or Linux (Ubuntu 20.04 or later).",
        "Programming Language: Python 3.9 or later.",
        "Development Environment: Jupyter Notebook / Google Colab.",
        "Libraries: NumPy, Pandas, SciPy, Scikit-learn, XGBoost, TensorFlow / Keras, "
        "OpenCV, MNE-Python, Matplotlib, Seaborn.",
        "Explainability: SHAP, LIME.",
        "Documentation: MS Office / Google Docs."]),

    ("h2", "7. Stakeholders"),
    ("bul", [
        "Patients and at-risk individuals \u2014 early, affordable, non-invasive "
        "screening for Parkinson's Disease.",
        "Neurologists and clinicians \u2014 an objective second opinion with "
        "explanations that support clinical judgment.",
        "Hospitals and diagnostic centres \u2014 a high-throughput pre-screening tool "
        "for outpatient and community camps.",
        "Healthcare researchers and data scientists \u2014 a reproducible multimodal "
        "benchmark for PD detection studies.",
        "Caregivers and families \u2014 earlier intervention and better care planning.",
        "Government and public-health programs \u2014 scalable screening for rural and "
        "remote populations through telemedicine."]),

    ("h2", "8. Benefits to Society"),
    ("bul", [
        "Early detection enables earlier treatment, slowing disease progression and "
        "improving quality of life.",
        "Non-invasive, radiation-free and low-cost \u2014 suitable for mass and "
        "community-level screening.",
        "Explainable outcomes (SHAP, LIME) build clinician trust and keep the system "
        "auditable.",
        "Multimodal fusion reduces the false alarms of single-modality tools.",
        "Telemedicine-friendly \u2014 supports remote and rural diagnosis.",
        "Reduces long-term healthcare cost and caregiver burden through earlier "
        "intervention."]),

    ("h2", "9. Expected Outcomes"),
    ("p", "The implemented framework is expected to deliver the outcomes below. All five "
          "modalities are IMPLEMENTED and contribute to the final weighted multimodal "
          "fusion decision."),
    ("tbl",
     ["System / Model", "Expected Accuracy"],
     [["Voice modality", "91.3%"],
      ["Gait modality", "92.6%"],
      ["EEG modality", "93.5%"],
      ["Handwriting modality", "90.8%"],
      ["MRI modality", "94.7%"],
      ["Feature-level fusion", "95.9%"],
      ["Decision-level fusion", "96.4%"],
      ["Proposed weighted multimodal fusion (Feature + Decision)", "97.2%"]],
     [0.72, 0.28]),
    ("bul", [
        "End-to-end IMPLEMENTED pipeline for all five modalities \u2014 Voice, Gait, "
        "EEG, Handwriting and MRI.",
        "Fusion accuracy of 97.2% for early detection of Parkinson's Disease, the "
        "highest among all single-modality and partial-fusion models.",
        "Complete validation with Accuracy, Precision, Recall, F1, AUC and ROC.",
        "SHAP and LIME explanations for every prediction, giving biomarker-level "
        "interpretability.",
        "Improved robustness and reduced false positives compared with "
        "single-modality systems.",
        "A deployable early-screening prototype for clinical decision support."]),

    ("h2", "10. References"),
    ("refs", [
        "M. A. Little, P. E. McSharry, S. J. Roberts, D. A. Costello and I. M. Morrison, "
        "\u201cSuitability of dysphonia measurements for telemonitoring of Parkinson's "
        "disease,\u201d IEEE Transactions on Biomedical Engineering, vol. 56, no. 4, "
        "pp. 1015\u20131022, 2009. (Voice dataset #174, UCI Parkinson's dataset)",
        "C. R. Pereira, S. A. T. Weber, C. Hook, G. H. Rosa and J. P. Papa, \u201cDeep "
        "learning-aided Parkinson's disease diagnosis from handwritten dynamics,\u201d "
        "in Proc. 29th SIBGRAPI Conference on Graphics, Patterns and Images (SIBGRAPI), "
        "pp. 340\u2013346, 2016. (NewHandPD dataset)",
        "\u201cUCSD Resting State EEG Data from Patients with Parkinson's "
        "Disease,\u201d OpenNeuro, ds002778, 2020. [Online]. Available: "
        "https://openneuro.org/datasets/ds002778 (doi: 10.18112/openneuro.ds002778.v1.0.5)",
        "I. Sheriff, \u201cParkinson's Brain MRI Dataset,\u201d Kaggle, 2023. [Online]. "
        "Available: https://www.kaggle.com/datasets/irfansheriff/parkinsons-brain-mri-dataset",
        "Project Dataset Guide (gait cohort: 166 people, 306 walks), Team 5B, Department "
        "of CSE, ANITS, 2026.",
        "S. M. Lundberg and S.-I. Lee, \u201cA unified approach to interpreting model "
        "predictions,\u201d in Advances in Neural Information Processing Systems "
        "(NeurIPS), vol. 30, 2017. (SHAP)",
        "M. T. Ribeiro, S. Singh and C. Guestrin, \u201c\u2018Why should I trust "
        "you?\u2019: Explaining the predictions of any classifier,\u201d in Proc. 22nd "
        "ACM SIGKDD International Conference on Knowledge Discovery and Data Mining, "
        "pp. 1135\u20131144, 2016. (LIME)",
        "T. Chen and C. Guestrin, \u201cXGBoost: A scalable tree boosting system,\u201d "
        "in Proc. 22nd ACM SIGKDD, pp. 785\u2013794, 2016.",
        "L. Breiman, \u201cRandom forests,\u201d Machine Learning, vol. 45, no. 1, "
        "pp. 5\u201332, 2001.",
        "C. Cortes and V. Vapnik, \u201cSupport-vector networks,\u201d Machine "
        "Learning, vol. 20, no. 3, pp. 273\u2013297, 1996.",
        "S. Hochreiter and J. Schmidhuber, \u201cLong short-term memory,\u201d Neural "
        "Computation, vol. 9, no. 8, pp. 1735\u20131780, 1997.",
        "Y. LeCun, Y. Bengio and G. Hinton, \u201cDeep learning,\u201d Nature, "
        "vol. 521, pp. 436\u2013444, 2015.",
        "R. B. Postuma et al., \u201cMDS clinical diagnostic criteria for Parkinson's "
        "disease,\u201d Movement Disorders, vol. 30, no. 12, pp. 1591\u20131601, 2015."]),
]


# ----------------------------------------------------------------------------
# Block diagram (Figure 3)
# ----------------------------------------------------------------------------
def make_logo():
    from PIL import Image
    if os.path.exists(LOGO):
        print("logo: reusing", os.path.basename(LOGO))
        return
    src_candidates = [os.path.join(ASSETS, "logo_c4.jpg"),
                      os.path.join(ASSETS, "logo_c3.jpg"),
                      os.path.join(ASSETS, "logo_c2.jpg"),
                      os.path.join(ASSETS, "logo_c1.jpg")]
    for src in src_candidates:
        if os.path.exists(src):
            im = Image.open(src).convert("RGB")
            im.save(LOGO)
            print(f"logo <- {os.path.basename(src)} {im.size}")
            return
    raise SystemExit("No logo candidate found")


def make_diagram_full():
    """One clean full-height figure containing every stage of Figure 3."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

    fig, ax = plt.subplots(figsize=(7.4, 9.6))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 132)
    ax.axis("off")

    C_HEAD = "#35618F"
    C_CHIP, C_CHIP_E = "#E8F1FB", "#35618F"
    C_PROC, C_PROC_E = "#FFF6E0", "#C8891B"
    C_FEAT = "#EAF2FA"
    C_ML, C_ML_E = "#EAF4EA", "#2E7D32"
    C_FUS, C_FUS_E = "#FDEFE3", "#D2691E"
    C_VAL, C_VAL_E = "#F1F1F6", "#5E5E7A"
    C_XAI = "#F1F1F6"
    C_OUT, C_OUT_E = "#CDEBC8", "#2E7D32"
    GREEN = "#1B7A1B"

    def box(x0, y0, x1, y1, fc, ec, lw=1.3, round_=0.4):
        ax.add_patch(FancyBboxPatch((x0, y0), x1 - x0, y1 - y0,
                     boxstyle=f"round,pad=0.0,rounding_size={round_}",
                     linewidth=lw, edgecolor=ec, facecolor=fc, zorder=2))

    def ct(x, y, s, size=8, weight="normal", color="#111111"):
        ax.text(x, y, s, ha="center", va="center", fontsize=size,
                fontweight=weight, color=color, zorder=3, linespacing=1.35)

    def arrow(x0, y0, x1, y1, color="#444444"):
        ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle="-|>",
                     mutation_scale=11, linewidth=1.3, color=color, zorder=4))

    def vl(x, y0, y1, color="#555555"):
        ax.plot([x, x], [y0, y1], color=color, lw=1.2, zorder=1)

    def hl(x0, x1, y, color="#555555"):
        ax.plot([x0, x1], [y, y], color=color, lw=1.2, zorder=1)

    # Row 1: header (123-131)
    box(10, 123, 90, 131, C_HEAD, C_HEAD)
    ct(50, 127, "PATIENT DATA COLLECTION  (5 BRANCHES)", 10, "bold", "white")

    # Row 2: branches (106-120)
    labels = ["Voice", "Gait", "EEG", "Handwriting", "MRI"]
    centers = [10, 30, 50, 70, 90]
    cw = 17.5
    for cx, lab in zip(centers, labels):
        box(cx - cw / 2, 106, cx + cw / 2, 120, C_CHIP, C_CHIP_E, round_=0.35)
        ct(cx, 115.2, lab, 8.5, "bold")
        ct(cx, 109.8, "[IMPLEMENTED]", 6.8, "bold", GREEN)
        arrow(cx, 120, cx, 123, C_CHIP_E)

    # merge bus (103) -> preprocessing (90-101)
    for cx in centers:
        vl(cx, 106, 103, C_CHIP_E)
    hl(centers[0], centers[-1], 103, C_CHIP_E)
    arrow(50, 103, 50, 101, C_CHIP_E)

    box(6, 90, 94, 101, C_PROC, C_PROC_E)
    ct(50, 97.8, "PREPROCESSING", 9.5, "bold")
    ct(50, 93.2,
       "Noise Removal  |  Missing Values  |  Normalization  |  Balancing", 8)
    arrow(50, 90, 50, 87)

    # Feature extraction (76-87)
    box(6, 76, 94, 87, C_FEAT, C_CHIP_E)
    ct(50, 83.8, "FEATURE EXTRACTION", 9.5, "bold")
    ct(50, 79.2, "148 total features  \u2192  60 selected   (PCA, LASSO, mRMR)", 8)

    # ML / DL (61-73)
    ax.plot([26.5, 26.5, 73.5, 73.5], [76, 74.5, 74.5, 73], color="#555555", lw=1.2, zorder=1)
    vl(50, 76, 74.5)
    arrow(26.5, 74.5, 26.5, 73)
    arrow(73.5, 74.5, 73.5, 73)
    box(6, 61, 47, 73, C_ML, C_ML_E)
    ct(26.5, 69.4, "MACHINE LEARNING (ML)", 8.5, "bold")
    ct(26.5, 64.4, "SVM, RF, KNN, XGBoost", 7.5)
    box(53, 61, 94, 73, C_ML, C_ML_E)
    ct(73.5, 69.4, "DEEP LEARNING (DL)", 8.5, "bold")
    ct(73.5, 64.4, "CNN, LSTM, CNN-LSTM", 7.5)

    # -> fusion (46-58)
    vl(26.5, 61, 59.5)
    vl(73.5, 61, 59.5)
    hl(26.5, 73.5, 59.5)
    arrow(50, 59.5, 50, 58, C_FUS_E)
    box(6, 46, 94, 58, C_FUS, C_FUS_E, lw=1.6)
    ct(50, 54.6, "MULTIMODAL FUSION  (FEATURE + DECISION)", 9, "bold")
    ct(50, 49.4, "Weights: EEG 0.25,  MRI 0.2,  Voice 0.2,  Gait 0.2,  Hand 0.15", 8)
    arrow(50, 46, 50, 43, C_FUS_E)

    # Validation (32-43)
    box(6, 32, 94, 43, C_VAL, C_VAL_E)
    ct(50, 39.7, "VALIDATION", 9, "bold")
    ct(50, 35.2, "Accuracy, Precision, Recall, F1, AUC, ROC", 8)
    arrow(50, 32, 50, 29)

    # XAI (18-29)
    box(6, 18, 94, 29, C_XAI, C_VAL_E)
    ct(50, 25.7, "XAI (EXPLAINABILITY)", 9, "bold")
    ct(50, 21.2, "SHAP, LIME", 8)
    arrow(50, 18, 50, 13)

    # Early detection (3-13)
    box(16, 3, 84, 13, C_OUT, C_OUT_E, lw=1.8, round_=0.6)
    ct(50, 8, "EARLY DETECTION OF PARKINSON'S DISEASE", 10, "bold", "#145214")

    fig.savefig(DIAGRAM, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("diagram saved")


# ----------------------------------------------------------------------------
# DOCX renderer
# ----------------------------------------------------------------------------
def build_docx():
    from docx import Document
    from docx.shared import Pt, Inches, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    def set_run(r, size=12, bold=False, italic=False, color=None, font="Times New Roman"):
        r.font.name = font
        r.font.size = Pt(size)
        r.bold = bold
        r.italic = italic
        if color:
            r.font.color.rgb = RGBColor(*color)
        rpr = r._element.get_or_add_rPr()
        rf = rpr.find(qn('w:rFonts'))
        if rf is None:
            rf = OxmlElement('w:rFonts')
            rpr.append(rf)
        for a in ('w:ascii', 'w:hAnsi', 'w:cs'):
            rf.set(qn(a), font)

    def add_par(doc, text, size=12, bold=False, italic=False, align="left",
                space_after=6, space_before=0, color=None, font="Times New Roman"):
        p = doc.add_paragraph()
        p.alignment = {"left": WD_ALIGN_PARAGRAPH.LEFT,
                       "center": WD_ALIGN_PARAGRAPH.CENTER,
                       "right": WD_ALIGN_PARAGRAPH.RIGHT,
                       "just": WD_ALIGN_PARAGRAPH.JUSTIFY}[align]
        pf = p.paragraph_format
        pf.space_after = Pt(space_after)
        pf.space_before = Pt(space_before)
        pf.line_spacing = 1.15
        r = p.add_run(text)
        set_run(r, size=size, bold=bold, italic=italic, color=color, font=font)
        return p

    def add_rule(doc):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(8)
        ppr = p._element.get_or_add_pPr()
        pbdr = OxmlElement('w:pBdr')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')
        bottom.set(qn('w:sz'), '8')
        bottom.set(qn('w:space'), '1')
        bottom.set(qn('w:color'), '444444')
        pbdr.append(bottom)
        ppr.append(pbdr)

    def shade_cell(cell, hexcolor):
        tcpr = cell._tc.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), hexcolor)
        tcpr.append(shd)

    def add_table(doc, header, rows, widths):
        t = doc.add_table(rows=1 + len(rows), cols=len(header))
        t.style = "Table Grid"
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        t.autofit = False
        total = Inches(6.4)
        for ri, row in enumerate([header] + rows):
            for ci, val in enumerate(row):
                cell = t.cell(ri, ci)
                cell.width = int(total * widths[ci])
                cell.text = ""
                p = cell.paragraphs[0]
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.space_before = Pt(2)
                r = p.add_run(str(val))
                set_run(r, size=10.5, bold=(ri == 0))
                if ri == 0:
                    shade_cell(cell, "D9E2EF")
                elif ri % 2 == 0:
                    shade_cell(cell, "F4F7FB")
        for row in t.rows:
            for ci, cell in enumerate(row.cells):
                cell.width = int(total * widths[ci])
        doc.add_paragraph().paragraph_format.space_after = Pt(2)
        return t

    def add_page_number_footer(doc):
        footer = doc.sections[0].footer
        p = footer.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run("Page ")
        set_run(r, size=9)
        fld = OxmlElement('w:fldSimple')
        fld.set(qn('w:instr'), 'PAGE')
        p._p.append(fld)

    doc = Document()

    # Base style
    st = doc.styles["Normal"]
    st.font.name = "Times New Roman"
    st.font.size = Pt(12)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')

    sec = doc.sections[0]
    sec.left_margin = Inches(1.0)
    sec.right_margin = Inches(1.0)
    sec.top_margin = Inches(0.9)
    sec.bottom_margin = Inches(0.9)

    add_page_number_footer(doc)

    # ---------------- Cover ----------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(6)
    p.add_run().add_picture(LOGO, width=Inches(1.15))

    add_par(doc, COLLEGE, size=12.5, bold=True, align="center", space_after=4)
    add_par(doc, DEPT, size=12, bold=True, align="center", space_after=10)
    add_rule(doc)
    add_par(doc, TITLE, size=15, bold=True, align="center", space_after=8, space_before=6)
    add_par(doc, DOC_LABEL, size=11, bold=True, align="center", space_after=18,
            color=(0x44, 0x44, 0x44))
    add_par(doc, TEAM_HEADER, size=12.5, bold=True, align="center", space_after=6)
    for line in TEAM:
        add_par(doc, line, size=12, align="center", space_after=3)
    add_par(doc, GUIDE, size=12, bold=True, align="center", space_after=6, space_before=10)
    add_par(doc, META, size=11.5, bold=True, align="center", space_after=4, space_before=8)

    doc.add_page_break()

    # ---------------- Body ----------------
    for block in BODY:
        kind = block[0]
        if kind == "h2":
            add_par(doc, block[1], size=13.5, bold=True, align="left",
                    space_before=12, space_after=6)
        elif kind == "h3":
            add_par(doc, block[1], size=12, bold=True, italic=True, align="left",
                    space_before=6, space_after=4)
        elif kind == "p":
            add_par(doc, block[1], size=12, align="just", space_after=6)
        elif kind == "bul":
            for item in block[1]:
                p = doc.add_paragraph(style="List Bullet")
                p.paragraph_format.space_after = Pt(3)
                r = p.add_run(item)
                set_run(r, size=11.5)
        elif kind == "num":
            for i, item in enumerate(block[1], 1):
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(3)
                p.paragraph_format.left_indent = Inches(0.35)
                r = p.add_run(f"{i}. {item}")
                set_run(r, size=11.5)
        elif kind == "refs":
            for i, item in enumerate(block[1], 1):
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(4)
                p.paragraph_format.left_indent = Inches(0.4)
                p.paragraph_format.first_line_indent = Inches(-0.4)
                r = p.add_run(f"[{i}] {item}")
                set_run(r, size=10.5)
        elif kind == "tbl":
            add_table(doc, block[1], block[2], block[3])
        elif kind == "fig":
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(3)
            p.add_run().add_picture(block[1], width=Inches(5.9))
            add_par(doc, block[2], size=10, italic=True, align="center", space_after=8)

    doc.save(DOCX_OUT)
    print("DOCX saved:", DOCX_OUT)


# ----------------------------------------------------------------------------
# PDF renderer
# ----------------------------------------------------------------------------
def build_pdf():
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
    from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                    Spacer, Table, TableStyle, Image, PageBreak,
                                    KeepTogether, HRFlowable, ListFlowable, ListItem)
    from reportlab.pdfbase import pdfmetrics
    from PIL import Image as PILImage

    def esc(s):
        return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

    PW, PH = A4
    M = 0.9 * inch

    styles = {
        "cover_col": ParagraphStyle("cc", fontName="Times-Bold", fontSize=11.5,
                                    leading=15, alignment=TA_CENTER, spaceAfter=4),
        "cover_dept": ParagraphStyle("cd", fontName="Times-Bold", fontSize=11.5,
                                     leading=15, alignment=TA_CENTER, spaceAfter=8),
        "cover_title": ParagraphStyle("ct", fontName="Times-Bold", fontSize=14.5,
                                      leading=19, alignment=TA_CENTER, spaceAfter=8,
                                      spaceBefore=6),
        "cover_label": ParagraphStyle("cl", fontName="Helvetica-Bold", fontSize=10.5,
                                      alignment=TA_CENTER, spaceAfter=16,
                                      textColor=colors.HexColor("#444444")),
        "cover_team_h": ParagraphStyle("cth", fontName="Times-Bold", fontSize=11.5,
                                       alignment=TA_CENTER, spaceAfter=5),
        "cover_team": ParagraphStyle("ctm", fontName="Times-Roman", fontSize=11,
                                     leading=15, alignment=TA_CENTER, spaceAfter=2),
        "cover_guide": ParagraphStyle("cg", fontName="Times-Bold", fontSize=11,
                                      alignment=TA_CENTER, spaceAfter=4, spaceBefore=8),
        "cover_meta": ParagraphStyle("cm", fontName="Times-Bold", fontSize=10.5,
                                     leading=14, alignment=TA_CENTER, spaceAfter=4,
                                     spaceBefore=8),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12.5,
                             leading=16, spaceBefore=12, spaceAfter=6,
                             textColor=colors.HexColor("#1a1a1a")),
        "h3": ParagraphStyle("h3", fontName="Times-BoldItalic", fontSize=11,
                             leading=14, spaceBefore=6, spaceAfter=4),
        "p": ParagraphStyle("p", fontName="Times-Roman", fontSize=10.8,
                            leading=14.5, alignment=TA_JUSTIFY, spaceAfter=6),
        "bul": ParagraphStyle("bul", fontName="Times-Roman", fontSize=10.5,
                              leading=13.8, alignment=TA_LEFT, spaceAfter=3,
                              leftIndent=14, bulletIndent=2),
        "num": ParagraphStyle("num", fontName="Times-Roman", fontSize=10.5,
                              leading=13.8, alignment=TA_JUSTIFY, spaceAfter=3,
                              leftIndent=18),
        "ref": ParagraphStyle("ref", fontName="Times-Roman", fontSize=9.5,
                              leading=12.5, alignment=TA_LEFT, spaceAfter=4,
                              leftIndent=18, firstLineIndent=-18),
        "cap": ParagraphStyle("cap", fontName="Times-Italic", fontSize=9.5,
                              leading=12, alignment=TA_CENTER, spaceAfter=8),
        "tc": ParagraphStyle("tc", fontName="Times-Roman", fontSize=9.5,
                             leading=12.5, alignment=TA_LEFT),
        "tcb": ParagraphStyle("tcb", fontName="Times-Bold", fontSize=9.5,
                              leading=12.5, alignment=TA_LEFT),
    }

    def on_page(canvas, doc_):
        canvas.saveState()
        canvas.setFont("Times-Roman", 8.5)
        canvas.setFillColor(colors.HexColor("#555555"))
        canvas.drawCentredString(PW / 2, 0.5 * inch, f"Page {doc_.page}")
        canvas.restoreState()

    def on_cover(canvas, doc_):
        pass

    docm = BaseDocTemplate(PDF_OUT, pagesize=A4,
                           leftMargin=M, rightMargin=M,
                           topMargin=0.8 * inch, bottomMargin=0.8 * inch)
    cover_frame = Frame(M, M, PW - 2 * M, PH - 1.6 * inch, id="cover")
    body_frame = Frame(M, M, PW - 2 * M, PH - 1.6 * inch, id="body")
    docm.addPageTemplates([
        PageTemplate(id="Cover", frames=[cover_frame], onPage=on_cover),
        PageTemplate(id="Body", frames=[body_frame], onPage=on_page),
    ])

    CW = PW - 2 * M  # content width
    story = []

    # ---------------- Cover ----------------
    iw, ih = PILImage.open(LOGO).size
    logo_w = 1.05 * inch
    logo_h = logo_w * ih / iw
    story.append(Spacer(1, 8))
    logo = Image(LOGO, width=logo_w, height=logo_h)
    logo.hAlign = "CENTER"
    story.append(logo)
    story.append(Spacer(1, 8))
    story.append(Paragraph(esc(COLLEGE), styles["cover_col"]))
    story.append(Paragraph(esc(DEPT), styles["cover_dept"]))
    story.append(HRFlowable(width="80%", thickness=0.8, color=colors.HexColor("#444444"),
                            spaceBefore=4, spaceAfter=8, hAlign="CENTER"))
    story.append(Paragraph(esc(TITLE), styles["cover_title"]))
    story.append(Paragraph(DOC_LABEL, styles["cover_label"]))
    story.append(Paragraph(TEAM_HEADER, styles["cover_team_h"]))
    for line in TEAM:
        story.append(Paragraph(esc(line), styles["cover_team"]))
    story.append(Paragraph(esc(GUIDE), styles["cover_guide"]))
    story.append(Paragraph(esc(META), styles["cover_meta"]))
    story.append(PageBreak())

    # ---------------- Body ----------------
    for block in BODY:
        kind = block[0]
        if kind == "h2":
            story.append(Paragraph(esc(block[1]), styles["h2"]))
        elif kind == "h3":
            story.append(Paragraph(esc(block[1]), styles["h3"]))
        elif kind == "p":
            story.append(Paragraph(esc(block[1]), styles["p"]))
        elif kind == "bul":
            for item in block[1]:
                story.append(Paragraph("\u2022  " + esc(item), styles["bul"]))
        elif kind == "num":
            for i, item in enumerate(block[1], 1):
                story.append(Paragraph(f"{i}. {esc(item)}", styles["num"]))
        elif kind == "refs":
            for i, item in enumerate(block[1], 1):
                story.append(Paragraph(f"[{i}] {esc(item)}", styles["ref"]))
        elif kind == "tbl":
            header, rows, widths = block[1], block[2], block[3]
            data = [[Paragraph(esc(str(v)), styles["tcb"]) for v in header]]
            for row in rows:
                data.append([Paragraph(esc(str(v)), styles["tc"]) for v in row])
            cw = [w * CW * 0.96 for w in widths]
            t = Table(data, colWidths=cw, hAlign="CENTER")
            t.setStyle(TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#777777")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9E2EF")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1),
                 [colors.white, colors.HexColor("#F4F7FB")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]))
            story.append(Spacer(1, 3))
            story.append(t)
            story.append(Spacer(1, 7))
        elif kind == "fig":
            diw, dih = PILImage.open(block[1]).size
            fw = 5.55 * inch
            if fw > CW * 0.98:
                fw = CW * 0.98
            fh = fw * dih / diw
            max_h = 7.4 * inch
            if fh > max_h:
                fh = max_h
                fw = fh * diw / dih
            img = Image(block[1], width=fw, height=fh)
            img.hAlign = "CENTER"
            story.append(KeepTogether([img, Paragraph(esc(block[2]), styles["cap"])]))

    docm.build(story)
    print("PDF saved:", PDF_OUT)


if __name__ == "__main__":
    make_logo()
    make_diagram_full()
    build_docx()
    build_pdf()
    print("done")
