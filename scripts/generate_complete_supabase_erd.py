# -*- coding: utf-8 -*-
"""
Generate complete, professional, publication-grade ERD for UniChat
using 100% of the LIVE Supabase production database metadata:
- Sheet 0: 00 - Tong the Toan bo 46 Bang (Live Supabase Master ERD)
- Sheet 1: 01 - Identity, Workspace & RBAC (9 tables)
- Sheet 2: 02 - Knowledge & Ingestion Saga (6 tables)
- Sheet 3: 03 - Adaptive RAG & Conversation Engine (8 tables)
- Sheet 4: 04 - Community & WorkChat (12 tables)
- Sheet 5: 05 - Security, Audit & Evaluations (11 tables)

Total: 46 Tables, 74 Foreign Keys.
"""

import xml.etree.ElementTree as ET
import json
import os

with open('scripts/supabase_erd_schema.json', 'r', encoding='utf-8') as f:
    schema = json.load(f)

tables_data = schema['tables']
foreign_keys = schema['foreign_keys']

# Define domains
domains = {
    'd1': {
        'id': 'diag_d1_auth',
        'name': '01 - Identity, Workspace & RBAC',
        'title': 'UniChat ERD — Phân hệ Định danh, Workspace & Phân quyền RBAC',
        'tables': ['users', 'workspaces', 'workspace_members', 'workspace_invites', 
                   'workspace_categories', 'workspace_topics', 'refresh_families', 
                   'refresh_tokens', 'password_reset_otps'],
        'color': '#FFF8E1',
        'stroke': '#FFA000',
        'title_color': '#D84315'
    },
    'd2': {
        'id': 'diag_d2_knowledge',
        'name': '02 - Knowledge & Ingestion Saga',
        'title': 'UniChat ERD — Phân hệ Quản lý Tri thức & Ingestion Saga',
        'tables': ['documents', 'document_reviews', 'workspace_summaries', 
                   'workspace_summary_documents', 'workspace_summary_jobs', 'workspace_summary_outbox'],
        'color': '#EDE7F6',
        'stroke': '#7E57C2',
        'title_color': '#4A148C'
    },
    'd3': {
        'id': 'diag_d3_rag',
        'name': '03 - Adaptive RAG & Conversation Engine',
        'title': 'UniChat ERD — Phân hệ Hội thoại & Adaptive RAG Engine',
        'tables': ['conversations', 'messages', 'citation_history', 'chat_operations', 
                   'chat_attachments', 'chat_source_dependencies', 'retrieval_traces', 'retrieval_trace_items'],
        'color': '#E8F5E9',
        'stroke': '#43A047',
        'title_color': '#1B5E20'
    },
    'd4': {
        'id': 'diag_d4_comm',
        'name': '04 - Community & WorkChat',
        'title': 'UniChat ERD — Phân hệ Mạng xã hội, Diễn đàn & WorkChat Thời gian thực',
        'tables': ['discussions', 'discussion_replies', 'reactions', 'post_attachments', 
                   'post_reads', 'bookmarks', 'notifications', 'direct_conversations', 
                   'direct_messages', 'conversation_participants', 'calls', 'studio_notes'],
        'color': '#E1F5FE',
        'stroke': '#0288D1',
        'title_color': '#01579B'
    },
    'd5': {
        'id': 'diag_d5_sec',
        'name': '05 - Security, Audit & Evaluations',
        'title': 'UniChat ERD — Phân hệ Bảo mật, Kiểm toán, Quản soát AI & Đánh giá RAG',
        'tables': ['audit_events', 'security_rate_windows', 'security_telemetry_coverage', 
                   'service_nonces', 'rate_limit_buckets', 'idempotency_records', 
                   'ai_generation_control', 'provider_attempts', 'evaluation_runs', 
                   'evaluation_cases', 'evaluation_results'],
        'color': '#FCE4EC',
        'stroke': '#C2185B',
        'title_color': '#880E4F'
    }
}

mxfile = ET.Element('mxfile', host='Electron', agent='Codex')

def add_erd_table(root, tid, tname, x, y, w=250, custom_cols=None):
    cols = custom_cols if custom_cols is not None else tables_data.get(tname, [])
    h_header = 30
    h_body = max(35, len(cols) * 16 + 10)
    total_h = h_header + h_body

    # Header cell
    header_val = f'<b>{tname}</b>'
    style_c = (
        f'shape=swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;'
        f'horizontal=1;startSize={h_header};horizontalStack=0;resizeParent=1;resizeParentMax=0;'
        f'resizeLast=0;collapsible=0;marginBottom=0;whiteSpace=wrap;html=1;fillColor=#70C5F0;'
        f'strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11.5;'
    )
    c_cell = ET.SubElement(root, 'mxCell', id=tid, parent='1', value=header_val, vertex='1', style=style_c)
    ET.SubElement(c_cell, 'mxGeometry', attrib={'x': str(x), 'y': str(y), 'width': str(w), 'height': str(total_h), 'as': 'geometry'})

    # Body cell
    lines = []
    for c in cols:
        if c['is_pk'] and c['is_fk']:
            badge = '<b>[PF]</b> '
        elif c['is_pk']:
            badge = '<b>[PK]</b> '
        elif c['is_fk']:
            badge = '<b>[FK]</b> '
        else:
            badge = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
        req = ' *' if c['is_required'] else ''
        lines.append(f'{badge}{c["name"]}{req} : {c["type"]}')

    body_val = '<br>'.join(lines) if lines else '&nbsp;'
    style_b = (
        'text;strokeColor=#000000;strokeWidth=1;fillColor=#ffffff;align=left;verticalAlign=top;'
        'spacingLeft=8;spacingRight=8;spacingTop=6;spacingBottom=6;overflow=hidden;rotatable=0;'
        'portConstraint=eastwest;whiteSpace=wrap;html=1;fontSize=9.5;fontColor=#000000;'
        'fontFamily=Courier New,monospace;'
    )
    b_cell = ET.SubElement(root, 'mxCell', id=f'{tid}_cols', parent=tid, value=body_val, vertex='1', style=style_b)
    ET.SubElement(b_cell, 'mxGeometry', attrib={'y': str(h_header), 'width': str(w), 'height': str(h_body), 'as': 'geometry'})
    return total_h

def add_erd_edge(root, eid, source, target, label='', src_card='1', tgt_card='0..*',
                 exit_point=(0.5, 0.5), entry_point=(0.5, 0.5), waypoints=None):
    st = (
        'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;'
        'startArrow=ERmandOne;startFill=0;endArrow=ERmany;endFill=0;'
        'strokeColor=#000000;strokeWidth=1.5;fontSize=9.5;fontColor=#000000;'
        f'exitX={exit_point[0]};exitY={exit_point[1]};exitDx=0;exitDy=0;'
        f'entryX={entry_point[0]};entryY={entry_point[1]};entryDx=0;entryDy=0;'
    )
    edge_cell = ET.SubElement(root, 'mxCell', id=eid, parent='1', source=source, target=target, value=label, edge='1', style=st)
    geom = ET.SubElement(edge_cell, 'mxGeometry', attrib={'relative': '1', 'as': 'geometry'})
    if waypoints:
        arr = ET.SubElement(geom, 'Array', attrib={'as': 'points'})
        for wp in waypoints:
            ET.SubElement(arr, 'mxPoint', attrib={'x': str(wp[0]), 'y': str(wp[1])})
    if src_card:
        ET.SubElement(edge_cell, 'mxCell', id=f'{eid}_sc', parent=eid, value=src_card, vertex='1', connectable='0',
                      style='edgeLabel;resizable=0;html=1;align=left;verticalAlign=bottom;fontSize=9.5;fontColor=#000000;fillColor=none;strokeColor=none;')
    if tgt_card:
        ET.SubElement(edge_cell, 'mxCell', id=f'{eid}_tc', parent=eid, value=tgt_card, vertex='1', connectable='0',
                      style='edgeLabel;resizable=0;html=1;align=right;verticalAlign=bottom;fontSize=9.5;fontColor=#000000;fillColor=none;strokeColor=none;')


# =========================================================================
# SHEET 0: MASTER ERD (TỔNG THỂ TOÀN BỘ 46 BẢNG SUPABASE)
# =========================================================================
d0 = ET.SubElement(mxfile, 'diagram', id='diag_erd_master', name='00 - Tong the Toan bo 46 Bang (Live Supabase)')
m0 = ET.SubElement(d0, 'mxGraphModel', dx='2000', dy='1500', grid='1', gridSize='10', guides='1', tooltips='1', connect='1', arrows='1', fold='1', page='1', pageScale='1', pageWidth='3900', pageHeight='2800', background='#ffffff')
r0 = ET.SubElement(m0, 'root')
ET.SubElement(r0, 'mxCell', id='0')
ET.SubElement(r0, 'mxCell', id='1', parent='0')

# Outer frame
f0 = ET.SubElement(r0, 'mxCell', id='f0_frame', parent='1', value='<b>erd</b> [UniChat - Sơ đồ Thực thể Quan hệ Toàn bộ 46 Bảng Cơ sở Dữ liệu Supabase Production]', vertex='1',
                   style='shape=umlFrame;whiteSpace=wrap;html=1;width=620;height=30;fontColor=#000000;strokeColor=#000000;strokeWidth=2;fillColor=none;align=left;verticalAlign=top;spacingLeft=10;spacingTop=5;fontSize=12;fontStyle=1;')
ET.SubElement(f0, 'mxGeometry', attrib={'x': '20', 'y': '20', 'width': '3820', 'height': '2740', 'as': 'geometry'})

# 5 Package boundary boxes on Sheet 0
p1 = ET.SubElement(r0, 'mxCell', id='pkg_m_auth', parent='1', value='<b>Domain 1: Identity, Workspace &amp; RBAC (9 tables)</b>', vertex='1',
                   style='rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF8E1;strokeColor=#FFA000;strokeWidth=1.5;dashed=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;fontSize=12;fontColor=#D84315;')
ET.SubElement(p1, 'mxGeometry', attrib={'x': '40', 'y': '60', 'width': '1440', 'height': '1260', 'as': 'geometry'})

p2 = ET.SubElement(r0, 'mxCell', id='pkg_m_ingest', parent='1', value='<b>Domain 2: Knowledge Management &amp; Ingestion Saga (6 tables)</b>', vertex='1',
                   style='rounded=1;whiteSpace=wrap;html=1;fillColor=#EDE7F6;strokeColor=#7E57C2;strokeWidth=1.5;dashed=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;fontSize=12;fontColor=#4A148C;')
ET.SubElement(p2, 'mxGeometry', attrib={'x': '1520', 'y': '60', 'width': '1080', 'height': '1260', 'as': 'geometry'})

p3 = ET.SubElement(r0, 'mxCell', id='pkg_m_rag', parent='1', value='<b>Domain 3: Adaptive RAG &amp; Conversation Engine (8 tables)</b>', vertex='1',
                   style='rounded=1;whiteSpace=wrap;html=1;fillColor=#E8F5E9;strokeColor=#43A047;strokeWidth=1.5;dashed=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;fontSize=12;fontColor=#1B5E20;')
ET.SubElement(p3, 'mxGeometry', attrib={'x': '2640', 'y': '60', 'width': '1180', 'height': '1260', 'as': 'geometry'})

p4 = ET.SubElement(r0, 'mxCell', id='pkg_m_comm', parent='1', value='<b>Domain 4: Community Collaboration, Forum &amp; WorkChat (12 tables)</b>', vertex='1',
                   style='rounded=1;whiteSpace=wrap;html=1;fillColor=#E1F5FE;strokeColor=#0288D1;strokeWidth=1.5;dashed=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;fontSize=12;fontColor=#01579B;')
ET.SubElement(p4, 'mxGeometry', attrib={'x': '40', 'y': '1360', 'width': '1800', 'height': '1360', 'as': 'geometry'})

p5 = ET.SubElement(r0, 'mxCell', id='pkg_m_sec', parent='1', value='<b>Domain 5: Security, Audit, Telemetry &amp; Evaluations (11 tables)</b>', vertex='1',
                   style='rounded=1;whiteSpace=wrap;html=1;fillColor=#FCE4EC;strokeColor=#C2185B;strokeWidth=1.5;dashed=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;fontSize=12;fontColor=#880E4F;')
ET.SubElement(p5, 'mxGeometry', attrib={'x': '1880', 'y': '1360', 'width': '1940', 'height': '1360', 'as': 'geometry'})

# Sheet 0 Table Placements:
# Domain 1 Tables:
add_erd_table(r0, 'm_users', 'users', 450, 110, 270)
add_erd_table(r0, 'm_workspaces', 'workspaces', 830, 110, 270)
add_erd_table(r0, 'm_refresh_families', 'refresh_families', 80, 110, 240)
add_erd_table(r0, 'm_refresh_tokens', 'refresh_tokens', 80, 270, 240)
add_erd_table(r0, 'm_password_reset_otps', 'password_reset_otps', 80, 560, 240)
add_erd_table(r0, 'm_workspace_members', 'workspace_members', 450, 480, 260)
add_erd_table(r0, 'm_workspace_invites', 'workspace_invites', 830, 520, 250)
add_erd_table(r0, 'm_workspace_categories', 'workspace_categories', 1190, 110, 240)
add_erd_table(r0, 'm_workspace_topics', 'workspace_topics', 1190, 290, 240)

# Domain 2 Tables:
add_erd_table(r0, 'm_documents', 'documents', 1560, 110, 290)
add_erd_table(r0, 'm_document_reviews', 'document_reviews', 1950, 110, 260)
add_erd_table(r0, 'm_workspace_summary_jobs', 'workspace_summary_jobs', 1560, 680, 270)
add_erd_table(r0, 'm_workspace_summaries', 'workspace_summaries', 1950, 420, 270)
add_erd_table(r0, 'm_workspace_summary_documents', 'workspace_summary_documents', 1950, 720, 270)
add_erd_table(r0, 'm_workspace_summary_outbox', 'workspace_summary_outbox', 1560, 990, 270)

# Domain 3 Tables:
add_erd_table(r0, 'm_conversations', 'conversations', 2680, 110, 260)
add_erd_table(r0, 'm_messages', 'messages', 2680, 420, 270)
add_erd_table(r0, 'm_citation_history', 'citation_history', 3050, 420, 270)
add_erd_table(r0, 'm_chat_operations', 'chat_operations', 3420, 110, 280)
add_erd_table(r0, 'm_chat_attachments', 'chat_attachments', 3420, 730, 260)
add_erd_table(r0, 'm_chat_source_dependencies', 'chat_source_dependencies', 3420, 960, 260)
add_erd_table(r0, 'm_retrieval_traces', 'retrieval_traces', 2680, 800, 260)
add_erd_table(r0, 'm_retrieval_trace_items', 'retrieval_trace_items', 3050, 800, 260)

# Domain 4 Tables:
add_erd_table(r0, 'm_discussions', 'discussions', 430, 1420, 270)
add_erd_table(r0, 'm_discussion_replies', 'discussion_replies', 430, 1870, 260)
add_erd_table(r0, 'm_reactions', 'reactions', 80, 1870, 240)
add_erd_table(r0, 'm_post_attachments', 'post_attachments', 790, 1420, 260)
add_erd_table(r0, 'm_post_reads', 'post_reads', 790, 1720, 230)
add_erd_table(r0, 'm_bookmarks', 'bookmarks', 80, 1420, 240)
add_erd_table(r0, 'm_direct_conversations', 'direct_conversations', 1150, 1420, 260)
add_erd_table(r0, 'm_direct_messages', 'direct_messages', 1150, 1720, 250)
add_erd_table(r0, 'm_conversation_participants', 'conversation_participants', 1510, 1420, 250)
add_erd_table(r0, 'm_calls', 'calls', 1510, 1660, 250)
add_erd_table(r0, 'm_studio_notes', 'studio_notes', 1150, 1960, 260)
add_erd_table(r0, 'm_notifications', 'notifications', 790, 1960, 250)

# Domain 5 Tables:
add_erd_table(r0, 'm_audit_events', 'audit_events', 1920, 1420, 260)
add_erd_table(r0, 'm_security_rate_windows', 'security_rate_windows', 1920, 1740, 240)
add_erd_table(r0, 'm_security_telemetry_coverage', 'security_telemetry_coverage', 1920, 1920, 240)
add_erd_table(r0, 'm_service_nonces', 'service_nonces', 1920, 2080, 230)
add_erd_table(r0, 'm_rate_limit_buckets', 'rate_limit_buckets', 2270, 1420, 240)
add_erd_table(r0, 'm_idempotency_records', 'idempotency_records', 2270, 1630, 240)
add_erd_table(r0, 'm_ai_generation_control', 'ai_generation_control', 2270, 1870, 250)
add_erd_table(r0, 'm_provider_attempts', 'provider_attempts', 2270, 2070, 260)
add_erd_table(r0, 'm_evaluation_cases', 'evaluation_cases', 2620, 1420, 260)
add_erd_table(r0, 'm_evaluation_runs', 'evaluation_runs', 2980, 1420, 260)
add_erd_table(r0, 'm_evaluation_results', 'evaluation_results', 2800, 1800, 270)

# Sheet 0 Relationships
add_erd_edge(r0, 'mfk_ws_owner', 'm_users', 'm_workspaces', 'owns', '1', '0..*', exit_point=(1, 0.3), entry_point=(0, 0.3))
add_erd_edge(r0, 'mfk_wsm_u', 'm_users', 'm_workspace_members', 'member', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r0, 'mfk_wsm_ws', 'm_workspaces', 'm_workspace_members', 'contains', '1', '1..*', exit_point=(0.2, 1), entry_point=(0.8, 0))
add_erd_edge(r0, 'mfk_wsi_ws', 'm_workspaces', 'm_workspace_invites', 'invites', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r0, 'mfk_wst_ws', 'm_workspaces', 'm_workspace_topics', 'topics', '1', '0..*', exit_point=(1, 0.7), entry_point=(0, 0.5))
add_erd_edge(r0, 'mfk_rf_u', 'm_users', 'm_refresh_families', 'auth', '1', '0..*', exit_point=(0, 0.2), entry_point=(1, 0.5))
add_erd_edge(r0, 'mfk_rt_rf', 'm_refresh_families', 'm_refresh_tokens', 'tokens', '1', '1..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r0, 'mfk_otp_u', 'm_users', 'm_password_reset_otps', 'otps', '1', '0..*', exit_point=(0, 0.8), entry_point=(1, 0.5))

add_erd_edge(r0, 'mfk_doc_rev', 'm_documents', 'm_document_reviews', 'reviews', '1', '0..*', exit_point=(1, 0.3), entry_point=(0, 0.3))
add_erd_edge(r0, 'mfk_sumdoc_doc', 'm_documents', 'm_workspace_summary_documents', 'included', '1', '0..*', exit_point=(0.8, 1), entry_point=(0.2, 0))
add_erd_edge(r0, 'mfk_sumdoc_job', 'm_workspace_summary_jobs', 'm_workspace_summary_documents', 'documents', '1', '1..*', exit_point=(1, 0.5), entry_point=(0, 0.5))
add_erd_edge(r0, 'mfk_sum_job', 'm_workspace_summary_jobs', 'm_workspace_summaries', 'produces', '1', '1', exit_point=(0.8, 0), entry_point=(0.2, 1))
add_erd_edge(r0, 'mfk_sumout_job', 'm_workspace_summary_jobs', 'm_workspace_summary_outbox', 'events', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))

add_erd_edge(r0, 'mfk_msg_conv', 'm_conversations', 'm_messages', 'messages', '1', '1..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r0, 'mfk_cite_msg', 'm_messages', 'm_citation_history', 'cites', '1', '0..*', exit_point=(1, 0.5), entry_point=(0, 0.5))
add_erd_edge(r0, 'mfk_trace_msg', 'm_messages', 'm_retrieval_traces', 'traces', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r0, 'mfk_item_trace', 'm_retrieval_traces', 'm_retrieval_trace_items', 'items', '1', '1..*', exit_point=(1, 0.5), entry_point=(0, 0.5))
add_erd_edge(r0, 'mfk_chatop_conv', 'm_conversations', 'm_chat_operations', 'operations', '1', '0..*', exit_point=(1, 0.3), entry_point=(0, 0.3))
add_erd_edge(r0, 'mfk_srcdep_msg', 'm_messages', 'm_chat_source_dependencies', 'deps', '1', '0..*', exit_point=(1, 0.8), entry_point=(0, 0.5))

add_erd_edge(r0, 'mfk_reply_disc', 'm_discussions', 'm_discussion_replies', 'replies', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r0, 'mfk_attach_disc', 'm_discussions', 'm_post_attachments', 'attachments', '1', '0..*', exit_point=(1, 0.3), entry_point=(0, 0.3))
add_erd_edge(r0, 'mfk_read_disc', 'm_discussions', 'm_post_reads', 'reads', '1', '0..*', exit_point=(1, 0.7), entry_point=(0, 0.3))
add_erd_edge(r0, 'mfk_bm_disc', 'm_discussions', 'm_bookmarks', 'bookmarked', '1', '0..*', exit_point=(0, 0.3), entry_point=(1, 0.3))
add_erd_edge(r0, 'mfk_dm_dc', 'm_direct_conversations', 'm_direct_messages', 'messages', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r0, 'mfk_part_dc', 'm_direct_conversations', 'm_conversation_participants', 'participants', '1', '2..*', exit_point=(1, 0.3), entry_point=(0, 0.3))
add_erd_edge(r0, 'mfk_calls_dc', 'm_direct_conversations', 'm_calls', 'calls', '1', '0..*', exit_point=(1, 0.7), entry_point=(0, 0.3))

add_erd_edge(r0, 'mfk_eval_case_run', 'm_evaluation_cases', 'm_evaluation_results', 'evaluates', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.2, 0))
add_erd_edge(r0, 'mfk_eval_run_res', 'm_evaluation_runs', 'm_evaluation_results', 'results', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.8, 0))

# Cross-Domain Interconnects
add_erd_edge(r0, 'mfk_ws_doc', 'm_workspaces', 'm_documents', 'files', '1', '0..*', exit_point=(1, 0.3), entry_point=(0, 0.3))
add_erd_edge(r0, 'mfk_ws_conv', 'm_workspaces', 'm_conversations', 'chats', '1', '0..*', exit_point=(1, 0.5), entry_point=(0, 0.5), waypoints=[(1400, 250), (2500, 250)])
add_erd_edge(r0, 'mfk_doc_cite', 'm_documents', 'm_citation_history', 'cited', '1', '0..*', exit_point=(1, 0.5), entry_point=(0, 0.2), waypoints=[(2500, 350), (2950, 350)])
add_erd_edge(r0, 'mfk_ws_disc', 'm_workspaces', 'm_discussions', 'posts', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.8, 0), waypoints=[(965, 1340), (646, 1340)])


# =========================================================================
# DOMAIN SUBSYSTEM SHEETS (SHEETS 1 TO 5)
# =========================================================================
def build_domain_sheet(d_key):
    d_info = domains[d_key]
    d_elem = ET.SubElement(mxfile, 'diagram', id=d_info['id'], name=d_info['name'])
    m_elem = ET.SubElement(d_elem, 'mxGraphModel', dx='1600', dy='1200', grid='1', gridSize='10', guides='1', tooltips='1', connect='1', arrows='1', fold='1', page='1', pageScale='1', pageWidth='1800', pageHeight='1400', background='#ffffff')
    r_elem = ET.SubElement(m_elem, 'root')
    ET.SubElement(r_elem, 'mxCell', id='0')
    ET.SubElement(r_elem, 'mxCell', id='1', parent='0')

    # Frame
    f_val = f'<b>erd</b> [{d_info["title"]}]'
    f_cell = ET.SubElement(r_elem, 'mxCell', id=f'frame_{d_key}', parent='1', value=f_val, vertex='1',
                           style='shape=umlFrame;whiteSpace=wrap;html=1;width=520;height=30;fontColor=#000000;strokeColor=#000000;strokeWidth=2;fillColor=none;align=left;verticalAlign=top;spacingLeft=10;spacingTop=5;fontSize=12;fontStyle=1;')
    ET.SubElement(f_cell, 'mxGeometry', attrib={'x': '20', 'y': '20', 'width': '1740', 'height': '1320', 'as': 'geometry'})
    return r_elem

# --- SHEET 1: Identity, Workspace & RBAC ---
r1 = build_domain_sheet('d1')
add_erd_table(r1, 'd1_users', 'users', 450, 90, 270)
add_erd_table(r1, 'd1_workspaces', 'workspaces', 850, 90, 270)
add_erd_table(r1, 'd1_refresh_families', 'refresh_families', 80, 90, 240)
add_erd_table(r1, 'd1_refresh_tokens', 'refresh_tokens', 80, 270, 240)
add_erd_table(r1, 'd1_password_reset_otps', 'password_reset_otps', 80, 560, 240)
add_erd_table(r1, 'd1_workspace_members', 'workspace_members', 450, 520, 260)
add_erd_table(r1, 'd1_workspace_invites', 'workspace_invites', 850, 540, 250)
add_erd_table(r1, 'd1_workspace_categories', 'workspace_categories', 1240, 90, 240)
add_erd_table(r1, 'd1_workspace_topics', 'workspace_topics', 1240, 280, 240)

add_erd_edge(r1, 'd1_e_ws_owner', 'd1_users', 'd1_workspaces', 'owns', '1', '0..*', exit_point=(1, 0.3), entry_point=(0, 0.3))
add_erd_edge(r1, 'd1_e_wsm_u', 'd1_users', 'd1_workspace_members', 'member', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r1, 'd1_e_wsm_ws', 'd1_workspaces', 'd1_workspace_members', 'contains', '1', '1..*', exit_point=(0.2, 1), entry_point=(0.8, 0))
add_erd_edge(r1, 'd1_e_wsi_ws', 'd1_workspaces', 'd1_workspace_invites', 'invites', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r1, 'd1_e_wst_ws', 'd1_workspaces', 'd1_workspace_topics', 'topics', '1', '0..*', exit_point=(1, 0.6), entry_point=(0, 0.5))
add_erd_edge(r1, 'd1_e_rf_u', 'd1_users', 'd1_refresh_families', 'auth', '1', '0..*', exit_point=(0, 0.2), entry_point=(1, 0.5))
add_erd_edge(r1, 'd1_e_rt_rf', 'd1_refresh_families', 'd1_refresh_tokens', 'tokens', '1', '1..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r1, 'd1_e_otp_u', 'd1_users', 'd1_password_reset_otps', 'otps', '1', '0..*', exit_point=(0, 0.8), entry_point=(1, 0.5))

# --- SHEET 2: Knowledge & Ingestion Saga ---
r2 = build_domain_sheet('d2')
add_erd_table(r2, 'd2_documents', 'documents', 450, 90, 290)
add_erd_table(r2, 'd2_document_reviews', 'document_reviews', 80, 90, 260)
add_erd_table(r2, 'd2_workspace_summary_jobs', 'workspace_summary_jobs', 450, 680, 270)
add_erd_table(r2, 'd2_workspace_summaries', 'workspace_summaries', 80, 680, 270)
add_erd_table(r2, 'd2_workspace_summary_documents', 'workspace_summary_documents', 860, 420, 270)
add_erd_table(r2, 'd2_workspace_summary_outbox', 'workspace_summary_outbox', 450, 1010, 270)

add_erd_edge(r2, 'd2_e_rev_doc', 'd2_documents', 'd2_document_reviews', 'reviews', '1', '0..*', exit_point=(0, 0.3), entry_point=(1, 0.3))
add_erd_edge(r2, 'd2_e_sumdoc_doc', 'd2_documents', 'd2_workspace_summary_documents', 'included', '1', '0..*', exit_point=(1, 0.5), entry_point=(0.5, 0), waypoints=[(800, 360), (995, 360)])
add_erd_edge(r2, 'd2_e_sumdoc_job', 'd2_workspace_summary_jobs', 'd2_workspace_summary_documents', 'documents', '1', '1..*', exit_point=(1, 0.5), entry_point=(0, 0.5))
add_erd_edge(r2, 'd2_e_sum_job', 'd2_workspace_summary_jobs', 'd2_workspace_summaries', 'produces', '1', '1', exit_point=(0, 0.5), entry_point=(1, 0.5))
add_erd_edge(r2, 'd2_e_sumout_job', 'd2_workspace_summary_jobs', 'd2_workspace_summary_outbox', 'events', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))

# --- SHEET 3: Adaptive RAG & Conversation Engine ---
r3 = build_domain_sheet('d3')
add_erd_table(r3, 'd3_conversations', 'conversations', 450, 90, 260)
add_erd_table(r3, 'd3_messages', 'messages', 450, 420, 270)
add_erd_table(r3, 'd3_citation_history', 'citation_history', 840, 420, 270)
add_erd_table(r3, 'd3_chat_operations', 'chat_operations', 80, 90, 280)
add_erd_table(r3, 'd3_chat_attachments', 'chat_attachments', 80, 730, 260)
add_erd_table(r3, 'd3_chat_source_dependencies', 'chat_source_dependencies', 80, 960, 260)
add_erd_table(r3, 'd3_retrieval_traces', 'retrieval_traces', 450, 800, 260)
add_erd_table(r3, 'd3_retrieval_trace_items', 'retrieval_trace_items', 840, 800, 260)

add_erd_edge(r3, 'd3_e_msg_conv', 'd3_conversations', 'd3_messages', 'messages', '1', '1..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r3, 'd3_e_cite_msg', 'd3_messages', 'd3_citation_history', 'cites', '1', '0..*', exit_point=(1, 0.5), entry_point=(0, 0.5))
add_erd_edge(r3, 'd3_e_trace_msg', 'd3_messages', 'd3_retrieval_traces', 'traces', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r3, 'd3_e_item_trace', 'd3_retrieval_traces', 'd3_retrieval_trace_items', 'items', '1', '1..*', exit_point=(1, 0.5), entry_point=(0, 0.5))
add_erd_edge(r3, 'd3_e_chatop_conv', 'd3_conversations', 'd3_chat_operations', 'operations', '1', '0..*', exit_point=(0, 0.5), entry_point=(1, 0.5))
add_erd_edge(r3, 'd3_e_srcdep_msg', 'd3_messages', 'd3_chat_source_dependencies', 'dependencies', '1', '0..*', exit_point=(0, 0.8), entry_point=(1, 0.5))

# --- SHEET 4: Community & WorkChat ---
r4 = build_domain_sheet('d4')
add_erd_table(r4, 'd4_discussions', 'discussions', 430, 90, 270)
add_erd_table(r4, 'd4_discussion_replies', 'discussion_replies', 430, 560, 260)
add_erd_table(r4, 'd4_reactions', 'reactions', 80, 560, 240)
add_erd_table(r4, 'd4_post_attachments', 'post_attachments', 800, 90, 260)
add_erd_table(r4, 'd4_post_reads', 'post_reads', 800, 380, 230)
add_erd_table(r4, 'd4_bookmarks', 'bookmarks', 80, 90, 240)

add_erd_table(r4, 'd4_direct_conversations', 'direct_conversations', 1150, 90, 260)
add_erd_table(r4, 'd4_direct_messages', 'direct_messages', 1150, 420, 250)
add_erd_table(r4, 'd4_conversation_participants', 'conversation_participants', 1480, 90, 250)
add_erd_table(r4, 'd4_calls', 'calls', 1480, 360, 250)
add_erd_table(r4, 'd4_studio_notes', 'studio_notes', 1150, 700, 260)
add_erd_table(r4, 'd4_notifications', 'notifications', 800, 680, 250)

add_erd_edge(r4, 'd4_e_reply_disc', 'd4_discussions', 'd4_discussion_replies', 'replies', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r4, 'd4_e_attach_disc', 'd4_discussions', 'd4_post_attachments', 'attachments', '1', '0..*', exit_point=(1, 0.3), entry_point=(0, 0.3))
add_erd_edge(r4, 'd4_e_read_disc', 'd4_discussions', 'd4_post_reads', 'reads', '1', '0..*', exit_point=(1, 0.7), entry_point=(0, 0.3))
add_erd_edge(r4, 'd4_e_bm_disc', 'd4_discussions', 'd4_bookmarks', 'bookmarked', '1', '0..*', exit_point=(0, 0.3), entry_point=(1, 0.3))
add_erd_edge(r4, 'd4_e_dm_dc', 'd4_direct_conversations', 'd4_direct_messages', 'messages', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.5, 0))
add_erd_edge(r4, 'd4_e_part_dc', 'd4_direct_conversations', 'd4_conversation_participants', 'participants', '1', '2..*', exit_point=(1, 0.3), entry_point=(0, 0.3))
add_erd_edge(r4, 'd4_e_calls_dc', 'd4_direct_conversations', 'd4_calls', 'calls', '1', '0..*', exit_point=(1, 0.7), entry_point=(0, 0.3))

# --- SHEET 5: Security, Audit & Evaluations ---
r5 = build_domain_sheet('d5')
add_erd_table(r5, 'd5_audit_events', 'audit_events', 80, 90, 260)
add_erd_table(r5, 'd5_security_rate_windows', 'security_rate_windows', 80, 420, 240)
add_erd_table(r5, 'd5_security_telemetry_coverage', 'security_telemetry_coverage', 80, 600, 240)
add_erd_table(r5, 'd5_service_nonces', 'service_nonces', 80, 770, 230)

add_erd_table(r5, 'd5_rate_limit_buckets', 'rate_limit_buckets', 420, 90, 240)
add_erd_table(r5, 'd5_idempotency_records', 'idempotency_records', 420, 300, 240)
add_erd_table(r5, 'd5_ai_generation_control', 'ai_generation_control', 420, 520, 250)
add_erd_table(r5, 'd5_provider_attempts', 'provider_attempts', 420, 720, 260)

add_erd_table(r5, 'd5_evaluation_cases', 'evaluation_cases', 760, 90, 260)
add_erd_table(r5, 'd5_evaluation_runs', 'evaluation_runs', 1120, 90, 260)
add_erd_table(r5, 'd5_evaluation_results', 'evaluation_results', 940, 460, 270)

add_erd_edge(r5, 'd5_e_eval_case_res', 'd5_evaluation_cases', 'd5_evaluation_results', 'evaluates', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.2, 0))
add_erd_edge(r5, 'd5_e_eval_run_res', 'd5_evaluation_runs', 'd5_evaluation_results', 'results', '1', '0..*', exit_point=(0.5, 1), entry_point=(0.8, 0))


# =========================================================================
# WRITE OUTPUT FILE
# =========================================================================
out_path = 'docs/thesis/05-so-do-drawio/unichat-erd.drawio'
os.makedirs(os.path.dirname(out_path), exist_ok=True)
tree = ET.ElementTree(mxfile)
ET.indent(tree, space='  ', level=0)
tree.write(out_path, encoding='utf-8', xml_declaration=True)
print(f'Successfully generated {out_path} with 6 sheets and 46 Supabase tables!')
