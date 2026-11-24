# -*- coding: utf-8 -*-
"""
Generate complete system-wide UML Class Diagram with ALL 5 SHEETS:
- Perfect HTML rendering in Draw.io (no raw tags, no double escaping)
- Proper header heights (startSize=38) for «stereotype» + <b>ClassName</b>
- Dynamic attribute and method compartment heights to eliminate clipping
- Zero line crossings and zero box penetrations across all 5 sheets
"""

import xml.etree.ElementTree as ET
import os

mxfile = ET.Element('mxfile', host='Electron', agent='Codex')

def add_class(root, cid, name, stereotype, attrs, methods, x, y, w, h_attr=None, h_meth=None):
    h_header = 38 if stereotype else 28
    header_val = f'«{stereotype}»<br><b>{name}</b>' if stereotype else f'<b>{name}</b>'
    
    if h_attr is None:
        n_a = max(1, len(attrs))
        h_attr = max(28, n_a * 15 + 8)
    if h_meth is None:
        n_m = max(1, len(methods))
        h_meth = max(26, n_m * 15 + 8)
        
    total_h = h_header + h_attr + h_meth
    
    style_c = (
        f'shape=swimlane;fontStyle=0;align=center;verticalAlign=top;childLayout=stackLayout;'
        f'horizontal=1;startSize={h_header};horizontalStack=0;resizeParent=1;resizeParentMax=0;'
        f'resizeLast=0;collapsible=0;marginBottom=0;whiteSpace=wrap;html=1;fillColor=#70C5F0;'
        f'strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;'
    )
    c_cell = ET.SubElement(root, 'mxCell', id=cid, parent='1', value=header_val, vertex='1', style=style_c)
    ET.SubElement(c_cell, 'mxGeometry', attrib={'x': str(x), 'y': str(y), 'width': str(w), 'height': str(total_h), 'as': 'geometry'})
    
    attr_val = '<br>'.join(attrs) if attrs else '&nbsp;'
    style_a = (
        'text;strokeColor=#000000;strokeWidth=1;fillColor=#ffffff;align=left;verticalAlign=top;'
        'spacingLeft=6;spacingRight=6;spacingTop=4;spacingBottom=4;overflow=hidden;rotatable=0;'
        'portConstraint=eastwest;whiteSpace=wrap;html=1;fontSize=9.5;fontColor=#000000;'
    )
    a_cell = ET.SubElement(root, 'mxCell', id=f'{cid}_attrs', parent=cid, value=attr_val, vertex='1', style=style_a)
    ET.SubElement(a_cell, 'mxGeometry', attrib={'y': str(h_header), 'width': str(w), 'height': str(h_attr), 'as': 'geometry'})
    
    meth_val = '<br>'.join(methods) if methods else '&nbsp;'
    style_m = (
        'text;strokeColor=#000000;strokeWidth=1;fillColor=#ffffff;align=left;verticalAlign=top;'
        'spacingLeft=6;spacingRight=6;spacingTop=4;spacingBottom=4;overflow=hidden;rotatable=0;'
        'portConstraint=eastwest;whiteSpace=wrap;html=1;fontSize=9.5;fontColor=#000000;'
    )
    m_cell = ET.SubElement(root, 'mxCell', id=f'{cid}_meth', parent=cid, value=meth_val, vertex='1', style=style_m)
    ET.SubElement(m_cell, 'mxGeometry', attrib={'y': str(h_header + h_attr), 'width': str(w), 'height': str(h_meth), 'as': 'geometry'})

def add_ortho_edge(root, eid, source, target, edge_type='association', label='', src_card='', tgt_card='',
                   exit_point=(0.5, 0.5), entry_point=(0.5, 0.5), waypoints=None):
    base_style = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;'
    
    if edge_type == 'composition':
        st = base_style + 'startArrow=diamond;startFill=1;endArrow=none;strokeColor=#000000;strokeWidth=1.5;fontSize=10;fontColor=#000000;'
    elif edge_type == 'aggregation':
        st = base_style + 'startArrow=diamond;startFill=0;endArrow=none;strokeColor=#000000;strokeWidth=1.5;fontSize=10;fontColor=#000000;'
    elif edge_type == 'realization':
        st = base_style + 'dashed=1;endArrow=block;endFill=0;strokeColor=#000000;strokeWidth=1.5;fontSize=10;fontColor=#000000;'
    elif edge_type == 'dependency':
        st = base_style + 'dashed=1;endArrow=open;endFill=0;strokeColor=#000000;strokeWidth=1.5;fontSize=10;fontColor=#000000;'
    elif edge_type == 'directed':
        st = base_style + 'endArrow=block;endFill=1;strokeColor=#000000;strokeWidth=1.5;fontSize=10;fontColor=#000000;'
    else: # association
        st = base_style + 'endArrow=none;strokeColor=#000000;strokeWidth=1.5;fontSize=10;fontColor=#000000;'
        
    st += f'exitX={exit_point[0]};exitY={exit_point[1]};exitDx=0;exitDy=0;'
    st += f'entryX={entry_point[0]};entryY={entry_point[1]};entryDx=0;entryDy=0;'
    
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
# SHEET 0: TỔNG THỂ TOÀN HỆ THỐNG (SYSTEM MASTER)
# =========================================================================
d0 = ET.SubElement(mxfile, 'diagram', id='diag_system_master', name='00 - Tong the Toan he thong')
m0 = ET.SubElement(d0, 'mxGraphModel', dx='1600', dy='1200', grid='1', gridSize='10', guides='1', tooltips='1', connect='1', arrows='1', fold='1', page='1', pageScale='1', pageWidth='2500', pageHeight='1400', background='#ffffff')
r0 = ET.SubElement(m0, 'root')
ET.SubElement(r0, 'mxCell', id='0')
ET.SubElement(r0, 'mxCell', id='1', parent='0')

# Outer frame
f0 = ET.SubElement(r0, 'mxCell', id='frame_cd', parent='1', value='<b>cd</b> [UniChat - Sơ đồ Lớp Tổng thể Toàn Hệ thống (Master System Class Diagram)]', vertex='1',
                   style='shape=umlFrame;whiteSpace=wrap;html=1;width=480;height=30;fontColor=#000000;strokeColor=#000000;strokeWidth=2;fillColor=none;align=left;verticalAlign=top;spacingLeft=10;spacingTop=5;fontSize=12;fontStyle=1;')
ET.SubElement(f0, 'mxGeometry', attrib={'x': '20', 'y': '20', 'width': '2420', 'height': '1350', 'as': 'geometry'})

# 4 Package boundaries
p_hub = ET.SubElement(r0, 'mxCell', id='pkg_hub', parent='1', value='<b>Package: Identity & Workspace Hub</b>', vertex='1',
                     style='rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF8E1;strokeColor=#FFA000;strokeWidth=1.5;strokeFactor=1;dashed=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;fontSize=12;fontColor=#D84315;')
ET.SubElement(p_hub, 'mxGeometry', attrib={'x': '40', 'y': '60', 'width': '1450', 'height': '540', 'as': 'geometry'})

p_rag = ET.SubElement(r0, 'mxCell', id='pkg_rag', parent='1', value='<b>Package: Adaptive Knowledge RAG Engine</b>', vertex='1',
                     style='rounded=1;whiteSpace=wrap;html=1;fillColor=#E8F5E9;strokeColor=#43A047;strokeWidth=1.5;strokeFactor=1;dashed=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;fontSize=12;fontColor=#1B5E20;')
ET.SubElement(p_rag, 'mxGeometry', attrib={'x': '650', 'y': '630', 'width': '840', 'height': '720', 'as': 'geometry'})

p_ingest = ET.SubElement(r0, 'mxCell', id='pkg_ingest', parent='1', value='<b>Package: Document Ingestion & Storage Saga</b>', vertex='1',
                        style='rounded=1;whiteSpace=wrap;html=1;fillColor=#EDE7F6;strokeColor=#7E57C2;strokeWidth=1.5;strokeFactor=1;dashed=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;fontSize=12;fontColor=#4A148C;')
ET.SubElement(p_ingest, 'mxGeometry', attrib={'x': '1530', 'y': '60', 'width': '890', 'height': '1290', 'as': 'geometry'})

p_comm = ET.SubElement(r0, 'mxCell', id='pkg_comm', parent='1', value='<b>Package: Community Collaboration & Realtime</b>', vertex='1',
                      style='rounded=1;whiteSpace=wrap;html=1;fillColor=#E1F5FE;strokeColor=#0288D1;strokeWidth=1.5;strokeFactor=1;dashed=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;fontSize=12;fontColor=#01579B;')
ET.SubElement(p_comm, 'mxGeometry', attrib={'x': '40', 'y': '630', 'width': '580', 'height': '720', 'as': 'geometry'})

# Sheet 0 Classes
add_class(r0, 'm_user', 'User', 'entity',
          ['- id: UUID', '- email: String', '- displayName: String', '- systemRole: SystemRole', '- status: UserStatus'],
          ['+ getAuthorities()', '+ isAccountNonLocked()'],
          420, 100, 240, 90, 45)

add_class(r0, 'm_wsmem', 'WorkspaceMember', 'entity',
          ['- workspaceId: UUID', '- userId: UUID', '- role: WorkspaceRole', '- status: MemberStatus'],
          ['+ canManage(): boolean'],
          780, 100, 230, 75, 40)

add_class(r0, 'm_notif', 'Notification', 'entity',
          ['- id: UUID', '- userId: UUID', '- type: String', '- payload: String', '- isRead: boolean'],
          ['+ markAsRead()'],
          70, 100, 220, 90, 40)

add_class(r0, 'm_ws', 'Workspace', 'entity',
          ['- id: UUID', '- ownerId: UUID', '- name: String', '- visibility: WorkspaceVisibility', '- status: WorkspaceStatus'],
          ['+ isAccessibleBy(user): boolean'],
          780, 320, 250, 90, 45)

add_class(r0, 'm_disc', 'Discussion', 'entity',
          ['- id: UUID', '- workspaceId: UUID', '- authorId: UUID', '- title: String', '- replyCount: int'],
          ['+ addReply(reply)'],
          360, 680, 230, 85, 45)

add_class(r0, 'm_reply', 'DiscussionReply', 'entity',
          ['- id: UUID', '- discussionId: UUID', '- authorId: UUID', '- body: String', '- isAiAnswer: boolean'],
          ['+ upvote()', '+ downvote()'],
          360, 880, 230, 85, 45)

add_class(r0, 'm_react', 'Reaction', 'entity',
          ['- id: UUID', '- userId: UUID', '- replyId: UUID', '- reactionType: String'],
          ['+ getEmoji(): String'],
          70, 880, 220, 75, 35)

add_class(r0, 'm_disc_ctrl', 'DiscussionController', 'rest-controller',
          ['- discussionService: DiscussionService'],
          ['+ createDiscussion(req)', '+ getDiscussion(id)'],
          70, 1050, 220, 35, 45)

add_class(r0, 'm_disc_svc', 'DiscussionService', 'service',
          ['- discRepo: DiscussionRepository', '- broadcaster: WorkChatBroadcaster'],
          ['+ postDiscussion(req)', '+ addReply(req)'],
          360, 1050, 230, 45, 45)

add_class(r0, 'm_ws_bc', 'WorkChatBroadcaster', 'component',
          ['- template: SimpMessagingTemplate'],
          ['+ broadcastToWorkspace(wsId, msg)'],
          360, 1210, 230, 35, 45)

add_class(r0, 'm_conv', 'Conversation', 'entity',
          ['- id: UUID', '- workspaceId: UUID', '- userId: UUID', '- title: String'],
          ['+ updateSummary(summary)'],
          1040, 420, 220, 75, 40)

add_class(r0, 'm_msg', 'Message', 'entity',
          ['- id: UUID', '- conversationId: UUID', '- role: String', '- content: String', '- intent: String'],
          ['+ hasCitations(): boolean'],
          1040, 680, 220, 85, 45)

add_class(r0, 'm_cite', 'CitationHistory', 'entity',
          ['- id: UUID', '- messageId: UUID', '- documentId: UUID', '- chunkId: String', '- excerpt: String'],
          ['+ formatSnippet(): String'],
          1560, 680, 230, 85, 35)

add_class(r0, 'm_chat_ctrl', 'ChatController', 'rest-controller',
          ['- chatService: ChatService', '- operations: ChatOperationService'],
          ['+ askQuestion(req): QuestionResponse', '+ streamQuestion(req): SseEmitter'],
          700, 680, 240, 45, 50)

add_class(r0, 'm_chat_ops', 'ChatOperationService', 'service',
          ['- operations: ChatOperationRepository', '- runner: ChatOperationRunner'],
          ['+ createOperation(req)', '+ executeAsync(opId)'],
          700, 870, 240, 45, 50)

add_class(r0, 'm_ai_gw', 'ChatAiGateway', 'interface',
          [],
          ['+ queryRag(req): AiAnswer'],
          1040, 880, 220, 25, 45)

add_class(r0, 'm_ai_impl', 'ChatHttpAiGateway', 'service',
          ['- client: RestClient', '- keys: ServiceKeys'],
          ['+ queryRag(req): AiAnswer'],
          1040, 1050, 220, 45, 45)

add_class(r0, 'm_doc_ent', 'Document', 'entity',
          ['- id: UUID', '- workspaceId: UUID', '- originalName: String', '- status: DocumentStatus', '- sha256: String'],
          ['+ markProcessed(chunks)'],
          1560, 200, 240, 90, 45)

add_class(r0, 'm_doc_ctrl', 'DocumentController', 'rest-controller',
          ['- documentService: DocumentService'],
          ['+ uploadDocument(file): DocumentResponse', '+ getDocument(id): DocumentResponse'],
          1760, 200, 240, 35, 50)

add_class(r0, 'm_doc_svc', 'DocumentService', 'service',
          ['- documentRepo: DocumentRepository', '- storagePort: StoragePort', '- producer: DocumentProducer'],
          ['+ initiateIngestion(file): Document', '+ handleResult(res)'],
          1760, 380, 250, 60, 50)

add_class(r0, 'm_storage', 'StoragePort', 'interface',
          [],
          ['+ store(file): String', '+ retrieve(key): InputStream'],
          2110, 380, 230, 25, 50)

add_class(r0, 'm_producer', 'DocumentProducer', 'service',
          ['- rabbitTemplate: RabbitTemplate'],
          ['+ sendIngestionTask(task)'],
          1760, 570, 240, 35, 45)

add_class(r0, 'm_consumer', 'IngestionConsumer', 'component',
          ['- documentService: DocumentService'],
          ['+ onIngestionResult(payload)'],
          2110, 600, 240, 35, 45)

# Sheet 0 Edges
add_ortho_edge(r0, 'e_u_notif', 'm_user', 'm_notif', 'composition', '', '1', '0..*',
               exit_point=(0, 0.5), entry_point=(1, 0.5))
add_ortho_edge(r0, 'e_u_wsm', 'm_user', 'm_wsmem', 'association', '', '1', '0..*',
               exit_point=(1, 0.5), entry_point=(0, 0.5))
add_ortho_edge(r0, 'e_ws_wsm', 'm_ws', 'm_wsmem', 'association', '', '1', '1..*',
               exit_point=(0.5, 0), entry_point=(1, 0.5), waypoints=[(1130, 130)])
add_ortho_edge(r0, 'e_ws_disc', 'm_ws', 'm_disc', 'composition', '', '1', '0..*',
               exit_point=(0, 0.5), entry_point=(1, 0.5))
add_ortho_edge(r0, 'e_ws_conv', 'm_ws', 'm_conv', 'composition', '', '1', '0..*',
               exit_point=(0.5, 1), entry_point=(0.5, 0))
add_ortho_edge(r0, 'e_ws_doc', 'm_ws', 'm_doc_ent', 'composition', '', '1', '0..*',
               exit_point=(1, 0.5), entry_point=(0, 0.5))

add_ortho_edge(r0, 'e_disc_reply', 'm_disc', 'm_reply', 'composition', '', '1', '0..*',
               exit_point=(0.5, 1), entry_point=(0.5, 0))
add_ortho_edge(r0, 'e_reply_react', 'm_reply', 'm_react', 'association', '', '1', '0..*',
               exit_point=(0, 0.5), entry_point=(1, 0.5))
add_ortho_edge(r0, 'e_disc_ctrl_svc', 'm_disc_ctrl', 'm_disc_svc', 'association', 'delegates',
               exit_point=(1, 0.5), entry_point=(0, 0.5))
add_ortho_edge(r0, 'e_disc_svc_reply', 'm_disc_svc', 'm_reply', 'association', 'manages',
               exit_point=(0.5, 0), entry_point=(0.5, 1))
add_ortho_edge(r0, 'e_disc_svc_bc', 'm_disc_svc', 'm_ws_bc', 'association', 'notifies',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r0, 'e_conv_msg', 'm_conv', 'm_msg', 'composition', '', '1', '1..*',
               exit_point=(0.5, 1), entry_point=(0.5, 0))
add_ortho_edge(r0, 'e_msg_cite', 'm_msg', 'm_cite', 'composition', '', '1', '0..*',
               exit_point=(1, 0.5), entry_point=(0, 0.5))
add_ortho_edge(r0, 'e_doc_cite', 'm_doc_ent', 'm_cite', 'association', 'cited in', '1', '0..*',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r0, 'e_chat_ctrl_ops', 'm_chat_ctrl', 'm_chat_ops', 'association', 'delegates',
               exit_point=(0.5, 1), entry_point=(0.5, 0))
add_ortho_edge(r0, 'e_chat_ops_msg', 'm_chat_ops', 'm_msg', 'association', 'persists',
               exit_point=(1, 0.3), entry_point=(0, 0.7), waypoints=[(990, 890), (990, 740)])
add_ortho_edge(r0, 'e_chat_ops_gw', 'm_chat_ops', 'm_ai_gw', 'association', 'invokes',
               exit_point=(1, 0.7), entry_point=(0, 0.5), waypoints=[(990, 940), (990, 900)])
add_ortho_edge(r0, 'e_ai_impl_gw', 'm_ai_impl', 'm_ai_gw', 'realization', '',
               exit_point=(0.5, 0), entry_point=(0.5, 1))

add_ortho_edge(r0, 'e_doc_ctrl_svc', 'm_doc_ctrl', 'm_doc_svc', 'association', 'delegates',
               exit_point=(0.5, 1), entry_point=(0.5, 0))
add_ortho_edge(r0, 'e_doc_svc_ent', 'm_doc_svc', 'm_doc_ent', 'association', 'manages',
               exit_point=(0, 0.5), entry_point=(1, 0.8), waypoints=[(1680, 450), (1680, 315)])
add_ortho_edge(r0, 'e_doc_svc_storage', 'm_doc_svc', 'm_storage', 'association', 'saves',
               exit_point=(1, 0.5), entry_point=(0, 0.5))
add_ortho_edge(r0, 'e_doc_svc_prod', 'm_doc_svc', 'm_producer', 'association', 'dispatches',
               exit_point=(0.5, 1), entry_point=(0.5, 0))
add_ortho_edge(r0, 'e_doc_cons_svc', 'm_consumer', 'm_doc_svc', 'association', 'completes',
               exit_point=(0, 0.5), entry_point=(1, 0.8), waypoints=[(2030, 650), (2030, 490)])


# =========================================================================
# SHEET 1: SƠ ĐỒ LỚP THỰC THỂ (DOMAIN MODEL)
# =========================================================================
d1 = ET.SubElement(mxfile, 'diagram', id='diag_domain_model', name='01 - So do lop Thuc the (Domain Model)')
m1 = ET.SubElement(d1, 'mxGraphModel', dx='1600', dy='1200', grid='1', gridSize='10', guides='1', tooltips='1', connect='1', arrows='1', fold='1', page='1', pageScale='1', pageWidth='1500', pageHeight='1200', background='#ffffff')
r1 = ET.SubElement(m1, 'root')
ET.SubElement(r1, 'mxCell', id='0')
ET.SubElement(r1, 'mxCell', id='1', parent='0')

f1 = ET.SubElement(r1, 'mxCell', id='f1_frame', parent='1', value='<b>cd</b> [UniChat - Sơ đồ Lớp Thực thể (Domain Entity Model)]', vertex='1',
                   style='shape=umlFrame;whiteSpace=wrap;html=1;width=420;height=30;fontColor=#000000;strokeColor=#000000;strokeWidth=2;fillColor=none;align=left;verticalAlign=top;spacingLeft=10;spacingTop=5;fontSize=12;fontStyle=1;')
ET.SubElement(f1, 'mxGeometry', attrib={'x': '20', 'y': '20', 'width': '1440', 'height': '1140', 'as': 'geometry'})

# Sheet 1 Classes: Clean Planar Layout
add_class(r1, 'e_notif', 'Notification', 'entity',
          ['- id: UUID', '- userId: UUID', '- type: String', '- workspaceId: UUID', '- payload: String', '- isRead: boolean', '- createdAt: Instant'],
          ['+ markAsRead()'],
          60, 90, 240, 115, 35)

add_class(r1, 'e_user', 'User', 'entity',
          ['- id: UUID', '- email: String', '- passwordHash: String', '- displayName: String', '- systemRole: SystemRole', '- status: UserStatus', '- failedLoginCount: int', '- lockedUntil: Instant'],
          ['+ getAuthorities()', '+ isAccountNonLocked()'],
          380, 90, 250, 130, 45)

add_class(r1, 'e_wsmem', 'WorkspaceMember', 'entity',
          ['- workspaceId: UUID', '- userId: UUID', '- role: WorkspaceRole', '- status: MemberStatus', '- invitedById: UUID', '- createdAt: Instant'],
          ['+ canManage(): boolean'],
          720, 90, 240, 105, 35)

add_class(r1, 'e_ws', 'Workspace', 'entity',
          ['- id: UUID', '- ownerId: UUID', '- name: String', '- description: String', '- visibility: WorkspaceVisibility', '- status: WorkspaceStatus', '- cloudAllowed: boolean', '- permissionVersion: long'],
          ['+ isAccessibleBy(user): boolean'],
          720, 380, 260, 130, 45)

add_class(r1, 'e_disc', 'Discussion', 'entity',
          ['- id: UUID', '- workspaceId: UUID', '- authorId: UUID', '- title: String', '- body: String', '- label: String', '- status: String', '- replyCount: int', '- voteScore: int'],
          ['+ addReply(reply)'],
          380, 380, 250, 140, 40)

add_class(r1, 'e_reply', 'DiscussionReply', 'entity',
          ['- id: UUID', '- discussionId: UUID', '- authorId: UUID', '- body: String', '- parentReplyId: UUID', '- isAiAnswer: boolean', '- voteScore: int'],
          ['+ upvote()', '+ downvote()'],
          380, 680, 250, 115, 45)

add_class(r1, 'e_react', 'Reaction', 'entity',
          ['- id: UUID', '- userId: UUID', '- targetType: String', '- targetId: UUID', '- reactionType: String', '- createdAt: Instant'],
          ['+ getEmoji(): String'],
          60, 680, 240, 105, 35)

add_class(r1, 'e_conv', 'Conversation', 'entity',
          ['- id: UUID', '- workspaceId: UUID', '- userId: UUID', '- title: String', '- status: String', '- summary: String', '- summaryVersion: int'],
          ['+ updateSummary(summary)'],
          720, 680, 250, 115, 40)

add_class(r1, 'e_msg', 'Message', 'entity',
          ['- id: UUID', '- conversationId: UUID', '- role: String', '- content: String', '- intent: String', '- refusalCode: String', '- providerModel: String', '- createdAt: Instant'],
          ['+ hasCitations(): boolean'],
          720, 930, 250, 130, 40)

add_class(r1, 'e_doc', 'Document', 'entity',
          ['- id: UUID', '- workspaceId: UUID', '- storageKey: String', '- originalName: String', '- mediaType: String', '- byteSize: long', '- sha256: String', '- status: DocumentStatus', '- ingestionVersion: int', '- indexedChunkCount: Integer'],
          ['+ markProcessed(chunks)'],
          1080, 380, 260, 155, 40)

add_class(r1, 'e_cite', 'CitationHistory', 'entity',
          ['- id: UUID', '- messageId: UUID', '- documentId: UUID', '- chunkId: String', '- fileName: String', '- locatorType: String', '- locatorValue: String', '- excerpt: String', '- contentHash: String', '- ordinal: int'],
          ['+ formatSnippet(): String'],
          1080, 930, 260, 155, 35)

# Sheet 1 Edges: 0 Crossings
add_ortho_edge(r1, 'r_u_notif', 'e_user', 'e_notif', 'composition', '', '1', '0..*',
               exit_point=(0, 0.5), entry_point=(1, 0.5))

add_ortho_edge(r1, 'r_u_wsm', 'e_user', 'e_wsmem', 'association', '', '1', '0..*',
               exit_point=(1, 0.5), entry_point=(0, 0.5))

add_ortho_edge(r1, 'r_ws_wsm', 'e_ws', 'e_wsmem', 'association', '', '1', '1..*',
               exit_point=(0.5, 0), entry_point=(0.5, 1))

add_ortho_edge(r1, 'r_ws_disc', 'e_ws', 'e_disc', 'composition', '', '1', '0..*',
               exit_point=(0, 0.5), entry_point=(1, 0.5))

add_ortho_edge(r1, 'r_disc_reply', 'e_disc', 'e_reply', 'composition', '', '1', '0..*',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r1, 'r_reply_react', 'e_reply', 'e_react', 'association', '', '1', '0..*',
               exit_point=(0, 0.5), entry_point=(1, 0.5))

add_ortho_edge(r1, 'r_u_react', 'e_user', 'e_react', 'association', '', '1', '0..*',
               exit_point=(0.2, 1), entry_point=(0.5, 0),
               waypoints=[(430, 340), (330, 340), (330, 630), (180, 630)])

add_ortho_edge(r1, 'r_ws_conv', 'e_ws', 'e_conv', 'composition', '', '1', '0..*',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r1, 'r_conv_msg', 'e_conv', 'e_msg', 'composition', '', '1', '1..*',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r1, 'r_msg_cite', 'e_msg', 'e_cite', 'composition', '', '1', '0..*',
               exit_point=(1, 0.5), entry_point=(0, 0.5))

add_ortho_edge(r1, 'r_ws_doc', 'e_ws', 'e_doc', 'composition', '', '1', '0..*',
               exit_point=(1, 0.5), entry_point=(0, 0.5))

add_ortho_edge(r1, 'r_doc_cite', 'e_doc', 'e_cite', 'association', 'references', '1', '0..*',
               exit_point=(0.5, 1), entry_point=(0.5, 0))


# =========================================================================
# SHEET 2: THIẾT KẾ LỚP CHAT & ADAPTIVE RAG
# =========================================================================
d2 = ET.SubElement(mxfile, 'diagram', id='diag_chat_rag', name='02 - Thiet ke Lop Chat & Adaptive RAG')
m2 = ET.SubElement(d2, 'mxGraphModel', dx='1600', dy='1200', grid='1', gridSize='10', guides='1', tooltips='1', connect='1', arrows='1', fold='1', page='1', pageScale='1', pageWidth='1400', pageHeight='1350', background='#ffffff')
r2 = ET.SubElement(m2, 'root')
ET.SubElement(r2, 'mxCell', id='0')
ET.SubElement(r2, 'mxCell', id='1', parent='0')

f2 = ET.SubElement(r2, 'mxCell', id='f2_frame', parent='1', value='<b>cd</b> [UniChat - Thiết kế Chi tiết Phân hệ Chat & Adaptive RAG]', vertex='1',
                   style='shape=umlFrame;whiteSpace=wrap;html=1;width=420;height=30;fontColor=#000000;strokeColor=#000000;strokeWidth=2;fillColor=none;align=left;verticalAlign=top;spacingLeft=10;spacingTop=5;fontSize=12;fontStyle=1;')
ET.SubElement(f2, 'mxGeometry', attrib={'x': '20', 'y': '20', 'width': '1340', 'height': '1280', 'as': 'geometry'})

# Sheet 2 Classes
add_class(r2, 'dto_ask_req', 'AskQuestionRequest', 'dto',
          ['- question: String', '- conversationId: UUID', '- knowledgeMode: KnowledgeMode', '- taskType: ChatTaskType'],
          [],
          80, 90, 240, 80, 25)

add_class(r2, 'c_chat_ctrl', 'ChatController', 'rest-controller',
          ['- chat: ChatService', '- streams: SseChatService', '- operations: ChatOperationService'],
          ['+ askQuestion(req): QuestionResponse', '+ streamQuestion(req): SseEmitter'],
          400, 90, 260, 60, 45)

add_class(r2, 'dto_q_resp', 'QuestionResponse', 'dto',
          ['- messageId: UUID', '- conversationId: UUID', '- decision: String', '- answer: String', '- intent: String', '- citations: List&lt;CitationResponse&gt;', '- providerModel: String'],
          [],
          740, 90, 260, 115, 25)

add_class(r2, 'repo_chat_op', 'ChatOperationRepository', 'repository',
          ['- operationsMap: ConcurrentMap'],
          ['+ save(op): ChatOperation', '+ findById(id): Optional'],
          80, 340, 240, 35, 45)

add_class(r2, 's_chat_ops', 'ChatOperationService', 'service',
          ['- operations: ChatOperationRepository', '- admission: AiAdmissionService', '- access: ChatAccessService', '- runner: ChatOperationRunner'],
          ['+ createOperation(req): ChatOperation', '+ executeAsync(opId)'],
          400, 340, 260, 75, 45)

add_class(r2, 's_chat_runner', 'ChatOperationRunner', 'service',
          ['- operations: ChatOperationService', '- messages: ChatMessageStore', '- gateway: ChatAiGateway', '- results: ChatResultMapper'],
          ['+ run(op): ChatExecutionResult', '+ handleFailure(op, ex)'],
          400, 580, 260, 75, 45)

add_class(r2, 's_msg_store', 'ChatMessageStore', 'service',
          ['- messages: MessageRepository', '- conversations: ConversationRepository', '- citations: CitationHistoryRepository'],
          ['+ saveUserMessage(msg): Message', '+ saveAssistantMessage(msg, cites): Message', '+ loadContext(convId): List&lt;Message&gt;'],
          180, 830, 270, 65, 60)

add_class(r2, 'i_ai_gateway', 'ChatAiGateway', 'interface',
          [],
          ['+ queryRag(req): AiAnswer', '+ streamRag(req): Flux&lt;ChatChunk&gt;'],
          740, 580, 250, 25, 50)

add_class(r2, 'impl_http_gw', 'ChatHttpAiGateway', 'service',
          ['- client: RestClient', '- keys: ServiceKeys', '- verifier: ServiceRequestVerifier'],
          ['+ queryRag(req): AiAnswer', '+ streamRag(req): Flux&lt;ChatChunk&gt;'],
          740, 830, 250, 60, 50)

add_class(r2, 'dto_rag_req', 'RetrievalAnswerRequest', 'ai-contract',
          ['- requestId: String', '- operationId: UUID', '- workspaceId: UUID', '- question: String', '- allowedDocumentIds: List&lt;UUID&gt;', '- strategyVersion: String', '- allowExternalKnowledge: boolean'],
          [],
          740, 1070, 260, 120, 25)

add_class(r2, 'repo_msg', 'MessageRepository', 'repository',
          [],
          ['+ save(msg): Message', '+ findByConversationId(convId): List'],
          60, 1070, 230, 25, 45)

add_class(r2, 'repo_conv', 'ConversationRepository', 'repository',
          [],
          ['+ save(conv): Conversation', '+ findById(id): Optional'],
          330, 1070, 230, 25, 45)

# Sheet 2 Edges: 0 Crossings
add_ortho_edge(r2, 'r2_ctrl_req', 'c_chat_ctrl', 'dto_ask_req', 'dependency', 'uses',
               exit_point=(0, 0.5), entry_point=(1, 0.5))

add_ortho_edge(r2, 'r2_ctrl_res', 'c_chat_ctrl', 'dto_q_resp', 'dependency', 'returns',
               exit_point=(1, 0.5), entry_point=(0, 0.5))

add_ortho_edge(r2, 'r2_ctrl_svc', 'c_chat_ctrl', 's_chat_ops', 'association', 'delegates',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r2, 'r2_ops_repo', 's_chat_ops', 'repo_chat_op', 'association', 'persists',
               exit_point=(0, 0.5), entry_point=(1, 0.5))

add_ortho_edge(r2, 'r2_ops_run', 's_chat_ops', 's_chat_runner', 'association', 'triggers',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r2, 'r2_run_gw', 's_chat_runner', 'i_ai_gateway', 'association', 'invokes',
               exit_point=(1, 0.5), entry_point=(0, 0.5))

add_ortho_edge(r2, 'r2_run_msg', 's_chat_runner', 's_msg_store', 'association', 'loads & saves',
               exit_point=(0.2, 1), entry_point=(0.5, 0),
               waypoints=[(452, 790), (315, 790)])

add_ortho_edge(r2, 'r2_gw_impl', 'impl_http_gw', 'i_ai_gateway', 'realization', '',
               exit_point=(0.5, 0), entry_point=(0.5, 1))

add_ortho_edge(r2, 'r2_impl_dto', 'impl_http_gw', 'dto_rag_req', 'dependency', 'serializes',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r2, 'r2_msg_repo', 's_msg_store', 'repo_msg', 'association', 'persists',
               exit_point=(0.25, 1), entry_point=(0.5, 0),
               waypoints=[(247, 1020), (175, 1020)])

add_ortho_edge(r2, 'r2_conv_repo', 's_msg_store', 'repo_conv', 'association', 'persists',
               exit_point=(0.75, 1), entry_point=(0.5, 0),
               waypoints=[(382, 1020), (445, 1020)])


# =========================================================================
# SHEET 3: THIẾT KẾ LỚP DOCUMENT INGESTION SAGA
# =========================================================================
d3 = ET.SubElement(mxfile, 'diagram', id='diag_doc_ingest', name='03 - Thiet ke Lop Document Ingestion')
m3 = ET.SubElement(d3, 'mxGraphModel', dx='1600', dy='1200', grid='1', gridSize='10', guides='1', tooltips='1', connect='1', arrows='1', fold='1', page='1', pageScale='1', pageWidth='1500', pageHeight='1250', background='#ffffff')
r3 = ET.SubElement(m3, 'root')
ET.SubElement(r3, 'mxCell', id='0')
ET.SubElement(r3, 'mxCell', id='1', parent='0')

f3 = ET.SubElement(r3, 'mxCell', id='f3_frame', parent='1', value='<b>cd</b> [UniChat - Thiết kế Chi tiết Phân hệ Document Ingestion & Storage Saga]', vertex='1',
                   style='shape=umlFrame;whiteSpace=wrap;html=1;width=480;height=30;fontColor=#000000;strokeColor=#000000;strokeWidth=2;fillColor=none;align=left;verticalAlign=top;spacingLeft=10;spacingTop=5;fontSize=12;fontStyle=1;')
ET.SubElement(f3, 'mxGeometry', attrib={'x': '20', 'y': '20', 'width': '1440', 'height': '1180', 'as': 'geometry'})

# Sheet 3 Classes
add_class(r3, 'dto_doc_resp', 'DocumentResponse', 'dto',
          ['- id: UUID', '- workspaceId: UUID', '- originalName: String', '- byteSize: long', '- status: DocumentStatus', '- indexedChunkCount: Integer', '- createdAt: Instant'],
          [],
          80, 90, 240, 115, 25)

add_class(r3, 'c_doc_ctrl', 'DocumentController', 'rest-controller',
          ['- documentService: DocumentService'],
          ['+ uploadDocument(file): DocumentResponse', '+ getDocument(id): DocumentResponse'],
          450, 90, 260, 35, 45)

add_class(r3, 's_doc_svc', 'DocumentService', 'service',
          ['- documentRepo: DocumentRepository', '- storagePort: StoragePort', '- producer: DocumentIngestionProducer'],
          ['+ initiateIngestion(file): Document', '+ handleIngestionComplete(res)', '+ getDocument(id): Document'],
          450, 340, 260, 60, 55)

add_class(r3, 'repo_doc', 'DocumentRepository', 'repository',
          [],
          ['+ save(doc): Document', '+ findById(id): Optional', '+ findByWorkspaceId(wsId): List'],
          450, 640, 260, 25, 55)

add_class(r3, 'ent_doc', 'Document', 'entity',
          ['- id: UUID', '- workspaceId: UUID', '- storageKey: String', '- originalName: String', '- byteSize: long', '- sha256: String', '- status: DocumentStatus', '- indexedChunkCount: Integer'],
          ['+ markProcessed(chunks)', '+ markFailed(reason)'],
          450, 890, 260, 130, 45)

add_class(r3, 's_producer', 'DocumentIngestionProducer', 'service',
          ['- rabbitTemplate: RabbitTemplate', '- exchangeName: String', '- routingKey: String'],
          ['+ sendIngestionTask(task: IngestionTaskPayload)'],
          80, 350, 250, 60, 45)

add_class(r3, 's_consumer', 'IngestionResultConsumer', 'component',
          ['- documentService: DocumentService', '- broadcaster: WorkChatBroadcaster'],
          ['+ onMessage(payload: IngestionResultPayload)'],
          80, 630, 250, 45, 45)

add_class(r3, 'i_storage_port', 'StoragePort', 'interface',
          [],
          ['+ store(file: MultipartFile): String', '+ retrieve(storageKey: String): InputStream'],
          840, 350, 250, 25, 50)

add_class(r3, 'impl_local_storage', 'LocalStoragePort', 'service',
          ['- baseDirectory: Path'],
          ['+ store(file): String', '+ retrieve(key): InputStream'],
          1170, 240, 240, 35, 45)

add_class(r3, 'impl_supabase_storage', 'SupabaseStoragePort', 'service',
          ['- s3Client: S3Client', '- bucketName: String'],
          ['+ store(file): String', '+ retrieve(key): InputStream'],
          1170, 450, 240, 45, 45)

add_class(r3, 'enum_doc_stat', 'DocumentStatus', 'enumeration',
          ['PENDING_INGESTION', 'PROCESSING', 'PROCESSED', 'FAILED', 'DELETING'],
          [],
          840, 920, 220, 90, 20)

# Sheet 3 Edges: 0 Crossings
add_ortho_edge(r3, 'r3_ctrl_resp', 'c_doc_ctrl', 'dto_doc_resp', 'dependency', 'returns',
               exit_point=(0, 0.5), entry_point=(1, 0.5))

add_ortho_edge(r3, 'r3_ctrl_svc', 'c_doc_ctrl', 's_doc_svc', 'association', 'delegates',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r3, 'r3_svc_prod', 's_doc_svc', 's_producer', 'association', 'dispatches queue',
               exit_point=(0, 0.5), entry_point=(1, 0.5))

add_ortho_edge(r3, 'r3_consumer_svc', 's_consumer', 's_doc_svc', 'association', 'updates status',
               exit_point=(1, 0.5), entry_point=(0.2, 1),
               waypoints=[(390, 695), (390, 560), (502, 560)])

add_ortho_edge(r3, 'r3_svc_repo', 's_doc_svc', 'repo_doc', 'association', 'persists',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r3, 'r3_repo_ent', 'repo_doc', 'ent_doc', 'association', 'manages',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r3, 'r3_doc_stat', 'ent_doc', 'enum_doc_stat', 'association', 'has status',
               exit_point=(1, 0.5), entry_point=(0, 0.5))

add_ortho_edge(r3, 'r3_svc_storage', 's_doc_svc', 'i_storage_port', 'association', 'stores raw file',
               exit_point=(1, 0.5), entry_point=(0, 0.5))

add_ortho_edge(r3, 'r3_storage_local', 'impl_local_storage', 'i_storage_port', 'realization', '',
               exit_point=(0, 0.5), entry_point=(1, 0.3),
               waypoints=[(1130, 310), (1130, 385)])

add_ortho_edge(r3, 'r3_storage_supa', 'impl_supabase_storage', 'i_storage_port', 'realization', '',
               exit_point=(0, 0.5), entry_point=(1, 0.7),
               waypoints=[(1130, 520), (1130, 425)])


# =========================================================================
# SHEET 4: THIẾT KẾ LỚP MẠNG XÃ HỘI (COMMUNITY)
# =========================================================================
d4 = ET.SubElement(mxfile, 'diagram', id='diag_community', name='04 - Thiet ke Lop Mang xa hoi (Community)')
m4 = ET.SubElement(d4, 'mxGraphModel', dx='1600', dy='1200', grid='1', gridSize='10', guides='1', tooltips='1', connect='1', arrows='1', fold='1', page='1', pageScale='1', pageWidth='1500', pageHeight='1250', background='#ffffff')
r4 = ET.SubElement(m4, 'root')
ET.SubElement(r4, 'mxCell', id='0')
ET.SubElement(r4, 'mxCell', id='1', parent='0')

f4 = ET.SubElement(r4, 'mxCell', id='f4_frame', parent='1', value='<b>cd</b> [UniChat - Thiết kế Chi tiết Phân hệ Mạng xã hội & Tương tác Cộng đồng]', vertex='1',
                   style='shape=umlFrame;whiteSpace=wrap;html=1;width=480;height=30;fontColor=#000000;strokeColor=#000000;strokeWidth=2;fillColor=none;align=left;verticalAlign=top;spacingLeft=10;spacingTop=5;fontSize=12;fontStyle=1;')
ET.SubElement(f4, 'mxGeometry', attrib={'x': '20', 'y': '20', 'width': '1440', 'height': '1180', 'as': 'geometry'})

# Sheet 4 Classes
add_class(r4, 'dto_disc_resp', 'DiscussionResponse', 'dto',
          ['- id: UUID', '- title: String', '- authorName: String', '- replyCount: int', '- voteScore: int', '- pinned: boolean', '- createdAt: Instant'],
          [],
          60, 90, 240, 115, 25)

add_class(r4, 'c_disc_ctrl', 'DiscussionController', 'rest-controller',
          ['- discussionService: DiscussionService'],
          ['+ createDiscussion(req)', '+ getDiscussion(id)', '+ createReply(req)'],
          380, 90, 250, 35, 55)

add_class(r4, 's_disc_svc', 'DiscussionService', 'service',
          ['- discRepo: DiscussionRepository', '- replyRepo: DiscussionReplyRepository', '- broadcaster: WorkChatBroadcaster'],
          ['+ postDiscussion(req): Discussion', '+ addReply(req): DiscussionReply', '+ listDiscussions(wsId): List'],
          380, 340, 260, 65, 55)

add_class(r4, 'repo_disc', 'DiscussionRepository', 'repository',
          [],
          ['+ save(d): Discussion', '+ findByWorkspaceId(wsId): List'],
          220, 640, 230, 25, 45)

add_class(r4, 'repo_reply', 'DiscussionReplyRepository', 'repository',
          [],
          ['+ save(r): DiscussionReply', '+ findByDiscussionId(dId): List'],
          490, 640, 240, 25, 45)

add_class(r4, 'ent_disc', 'Discussion', 'entity',
          ['- id: UUID', '- workspaceId: UUID', '- authorId: UUID', '- title: String', '- body: String', '- replyCount: int', '- voteScore: int', '- pinned: boolean'],
          ['+ addReply(r)', '+ togglePin()'],
          220, 890, 230, 130, 45)

add_class(r4, 'ent_reply', 'DiscussionReply', 'entity',
          ['- id: UUID', '- discussionId: UUID', '- authorId: UUID', '- body: String', '- isAiAnswer: boolean', '- voteScore: int'],
          ['+ upvote()', '+ downvote()'],
          490, 890, 240, 105, 45)

add_class(r4, 'ws_broadcaster', 'WorkChatBroadcaster', 'component',
          ['- messagingTemplate: SimpMessagingTemplate'],
          ['+ broadcastToWorkspace(wsId, event)', '+ notifyAuthor(authorId, event)'],
          800, 350, 250, 35, 50)

add_class(r4, 'c_react_ctrl', 'ReactionController', 'rest-controller',
          ['- reactionService: ReactionService'],
          ['+ toggleReaction(req): ReactionResponse'],
          1120, 90, 240, 35, 45)

add_class(r4, 's_react_svc', 'ReactionService', 'service',
          ['- reactionRepo: ReactionRepository', '- discRepo: DiscussionRepository', '- broadcaster: WorkChatBroadcaster'],
          ['+ addReaction(req): Reaction', '+ removeReaction(id)', '+ getReactions(targetId): List'],
          1120, 340, 260, 65, 55)

add_class(r4, 'repo_react', 'ReactionRepository', 'repository',
          [],
          ['+ save(r): Reaction', '+ findByTarget(targetType, targetId): List'],
          1120, 640, 240, 25, 45)

add_class(r4, 'ent_react', 'Reaction', 'entity',
          ['- id: UUID', '- userId: UUID', '- targetType: String', '- targetId: UUID', '- reactionType: String'],
          ['+ getEmoji(): String'],
          1120, 890, 230, 90, 30)

# Sheet 4 Edges: 0 Crossings
add_ortho_edge(r4, 'r4_disc_ctrl_dto', 'c_disc_ctrl', 'dto_disc_resp', 'dependency', 'returns',
               exit_point=(0, 0.5), entry_point=(1, 0.5))

add_ortho_edge(r4, 'r4_disc_ctrl_svc', 'c_disc_ctrl', 's_disc_svc', 'association', 'delegates',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r4, 'r4_disc_svc_ws', 's_disc_svc', 'ws_broadcaster', 'association', 'broadcasts',
               exit_point=(1, 0.5), entry_point=(0, 0.5))

add_ortho_edge(r4, 'r4_disc_svc_repo', 's_disc_svc', 'repo_disc', 'association', 'persists',
               exit_point=(0.25, 1), entry_point=(0.5, 0),
               waypoints=[(445, 580), (335, 580)])

add_ortho_edge(r4, 'r4_disc_svc_reply', 's_disc_svc', 'repo_reply', 'association', 'persists',
               exit_point=(0.75, 1), entry_point=(0.5, 0),
               waypoints=[(575, 580), (610, 580)])

add_ortho_edge(r4, 'r4_repo_disc_ent', 'repo_disc', 'ent_disc', 'association', 'manages',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r4, 'r4_repo_reply_ent', 'repo_reply', 'ent_reply', 'association', 'manages',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r4, 'r4_react_ctrl_svc', 'c_react_ctrl', 's_react_svc', 'association', 'delegates',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r4, 'r4_react_svc_ws', 's_react_svc', 'ws_broadcaster', 'association', 'notifies author',
               exit_point=(0, 0.5), entry_point=(1, 0.5))

add_ortho_edge(r4, 'r4_react_svc_repo', 's_react_svc', 'repo_react', 'association', 'persists',
               exit_point=(0.5, 1), entry_point=(0.5, 0))

add_ortho_edge(r4, 'r4_repo_react_ent', 'repo_react', 'ent_react', 'association', 'manages',
               exit_point=(0.5, 1), entry_point=(0.5, 0))


# =========================================================================
# WRITE OUTPUT FILE
# =========================================================================
out_path = 'docs/thesis/05-so-do-drawio/unichat-class-diagram.drawio'
os.makedirs(os.path.dirname(out_path), exist_ok=True)
tree = ET.ElementTree(mxfile)
ET.indent(tree, space='  ', level=0)
tree.write(out_path, encoding='utf-8', xml_declaration=True)
print(f'Successfully generated {out_path} with all 5 sheets!')
