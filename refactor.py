import re
import os

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Make a backup
with open('index_backup.html', 'w', encoding='utf-8') as f:
    f.write(content)

# We need to extract the parts and assemble the new layout.
# 1. Logo
logo_match = re.search(r'<!-- Logo -->\s*<div class="sidebar-logo">.*?</div>', content, re.DOTALL)
logo = logo_match.group(0) if logo_match else ""

# 2. Theme Switcher
theme_switcher_match = re.search(r'<!-- Theme Switcher -->\s*<div class="theme-switcher">.*?</div>\s*</div>', content, re.DOTALL)
if not theme_switcher_match:
     theme_switcher_match = re.search(r'<!-- Theme Switcher -->\s*<div class="theme-switcher">.*?</div>', content, re.DOTALL)
theme_switcher = theme_switcher_match.group(0) if theme_switcher_match else ""

# 3. Camera Section
camera_match = re.search(r'<!-- Camera -->\s*<div class="sidebar-section">.*?</div>\s*</div>\s*</div>', content, re.DOTALL)
if not camera_match:
    camera_match = re.search(r'<!-- Camera -->\s*<div class="sidebar-section">.*?</div>', content, re.DOTALL)
# Actually, the camera section contains nested divs. It's safer to use a regex that matches until the next comment.
camera_match = re.search(r'(<!-- Camera -->\s*<div class="sidebar-section">.*?)(?=<!-- Tư thế hiện tại -->)', content, re.DOTALL)
camera = camera_match.group(1).strip() if camera_match else ""

# 4. Pose Status
pose_match = re.search(r'(<!-- Tư thế hiện tại -->\s*<div class="sidebar-section">.*?)(?=<!-- Pomodoro -->)', content, re.DOTALL)
pose_status = pose_match.group(1).strip() if pose_match else ""

# 5. Pomodoro
pomodoro_match = re.search(r'(<!-- Pomodoro -->\s*<div class="sidebar-section">.*?)(?=<!-- Auth -->)', content, re.DOTALL)
pomodoro = pomodoro_match.group(1).strip() if pomodoro_match else ""

# 6. Auth
auth_match = re.search(r'(<!-- Auth -->\s*<div class="sidebar-auth" id="auth-section">.*?)(?=</aside>)', content, re.DOTALL)
auth = auth_match.group(1).strip() if auth_match else ""

# 7. Status Indicator (from Topbar)
status_match = re.search(r'<div class="status-indicator">.*?</div>', content, re.DOTALL)
status_ind = status_match.group(0) if status_match else ""
session_time_match = re.search(r'<span class="session-clock" id="session-time">.*?</span>', content, re.DOTALL)
session_time = session_time_match.group(0) if session_time_match else ""

# 8. Alert Timer Compact (from Topbar)
timer_compact_match = re.search(r'<div class="alert-timer-compact" id="alert-timer-section">.*?</div>', content, re.DOTALL)
timer_compact = timer_compact_match.group(0) if timer_compact_match else ""

# 9. Dashboard Cards
dash_cards_match = re.search(r'<!-- === DASHBOARD GRID === -->\s*<div class="dashboard-grid">(.*?)<!-- Card: Phòng học ảo \(chỉ hiện khi đăng nhập\) -->', content, re.DOTALL)
dash_cards = dash_cards_match.group(1).strip() if dash_cards_match else ""

# 10. Community Card
community_match = re.search(r'(<!-- Card: Phòng học ảo \(chỉ hiện khi đăng nhập\) -->\s*<div class="dash-card community-card hidden" id="network-panel">.*?)(?=</main>)', content, re.DOTALL)
# Community match needs to not include </main> but close its div properly.
community_card = ""
if community_match:
    community_text = community_match.group(1)
    # The community card has closing tags.
    # It ends with: "</div>" for the main dash-card
    # We will just take everything until the end of the dashboard grid.
    pass

# A better approach is to reconstruct from scratch by manually identifying chunks.

with open('index.html', 'w', encoding='utf-8') as f:
    f.write("")
