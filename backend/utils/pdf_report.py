"""PDF report generation for prediction results."""
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime


DARK_BG = colors.HexColor('#0a0f1e')
ACCENT = colors.HexColor('#00d4aa')
BLUE = colors.HexColor('#0066ff')
TEXT = colors.HexColor('#e2e8f0')
CARD = colors.HexColor('#1a2035')
WARN = colors.HexColor('#f59e0b')
DANGER = colors.HexColor('#ef4444')
SUCCESS = colors.HexColor('#10b981')


def generate_pdf_report(user: dict, input_data: dict, prediction: dict, insights: list) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=20*mm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('title', fontSize=22, textColor=ACCENT,
                                  spaceAfter=4, alignment=TA_CENTER, fontName='Helvetica-Bold')
    sub_style = ParagraphStyle('sub', fontSize=11, textColor=TEXT,
                                spaceAfter=12, alignment=TA_CENTER)
    h2_style = ParagraphStyle('h2', fontSize=14, textColor=ACCENT,
                               spaceAfter=8, fontName='Helvetica-Bold')
    body_style = ParagraphStyle('body', fontSize=10, textColor=TEXT, spaceAfter=6)
    label_style = ParagraphStyle('label', fontSize=9, textColor=colors.HexColor('#94a3b8'))

    story = []

    # Header
    story.append(Paragraph('FinAI — Financial Prediction Report', title_style))
    story.append(Paragraph(
        f"Generated for {user.get('username', 'User')} · {datetime.utcnow().strftime('%B %d, %Y %H:%M UTC')}",
        sub_style
    ))
    story.append(HRFlowable(width='100%', thickness=1, color=ACCENT))
    story.append(Spacer(1, 8*mm))

    # Prediction result
    pred_val = prediction.get('predicted_savings', 0)
    story.append(Paragraph('Predicted Savings', h2_style))
    val_style = ParagraphStyle('val', fontSize=32, textColor=SUCCESS if pred_val >= 0 else DANGER,
                                fontName='Helvetica-Bold', alignment=TA_CENTER)
    story.append(Paragraph(f"${pred_val:,.2f}", val_style))
    story.append(Spacer(1, 6*mm))

    # Input data table
    story.append(Paragraph('Your Financial Data', h2_style))
    tdata = [
        ['Parameter', 'Value'],
        ['Monthly Income', f"${input_data.get('income', 0):,.2f}"],
        ['Fixed Expenses', f"${input_data.get('fixed_expenses', 0):,.2f}"],
        ['Variable Expenses', f"${input_data.get('variable_expenses', 0):,.2f}"],
        ['Total Expenses', f"${input_data.get('total_expenses', 0):,.2f}"],
        ['Savings Goal', f"${input_data.get('savings_goal', 0):,.2f}"],
        ['Lifestyle Score', f"{input_data.get('lifestyle_score', 5):.1f} / 10"],
    ]
    t = Table(tdata, colWidths=[90*mm, 80*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD, DARK_BG]),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#334155')),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 8*mm))

    # Model comparison
    story.append(Paragraph('Model Comparison', h2_style))
    metrics = prediction.get('metrics', {})
    lr_m = metrics.get('linear_regression', {})
    rf_m = metrics.get('random_forest', {})
    best = metrics.get('best', 'N/A')

    mdata = [
        ['Model', 'R² Score', 'MAE ($)', 'RMSE ($)', 'Status'],
        ['Linear Regression',
         str(lr_m.get('r2', 'N/A')), str(lr_m.get('mae', 'N/A')), str(lr_m.get('rmse', 'N/A')),
         '✓ Selected' if best == 'linear_regression' else ''],
        ['Random Forest',
         str(rf_m.get('r2', 'N/A')), str(rf_m.get('mae', 'N/A')), str(rf_m.get('rmse', 'N/A')),
         '✓ Selected' if best == 'random_forest' else ''],
    ]
    mt = Table(mdata, colWidths=[50*mm, 30*mm, 30*mm, 30*mm, 30*mm])
    mt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD, DARK_BG]),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#334155')),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('PADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(mt)
    story.append(Spacer(1, 8*mm))

    # Insights
    story.append(Paragraph('AI Financial Insights', h2_style))
    for insight in insights:
        itype = insight.get('type', 'info')
        color_map = {'success': SUCCESS, 'danger': DANGER, 'warning': WARN, 'info': BLUE}
        c = color_map.get(itype, BLUE)
        title_s = ParagraphStyle('it', fontSize=11, textColor=c, fontName='Helvetica-Bold', spaceAfter=2)
        story.append(Paragraph(f"{insight.get('icon', '')} {insight.get('title', '')}", title_s))
        story.append(Paragraph(insight.get('text', ''), body_style))
        story.append(Spacer(1, 3*mm))

    # Footer
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#334155')))
    footer_style = ParagraphStyle('footer', fontSize=8, textColor=colors.HexColor('#64748b'),
                                   alignment=TA_CENTER, spaceAfter=0)
    story.append(Paragraph(
        'FinAI Prediction System · AI-Powered Financial Analytics · For informational purposes only',
        footer_style
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()
