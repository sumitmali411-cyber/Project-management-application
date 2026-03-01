# 🚀 All-In-One Project Management Application
## Full-Stack: Angular 17 + PrimeNG + Java Spring Boot + MySQL

> **Repository:** https://github.com/sumitmali411-cyber/Project-management-application  
> **Design Reference (Replit):** https://task-commit-hub--sumitmali411.replit.app  
> **Design Reference (Stitch):** https://stitch.withgoogle.com/projects/17911734835537799651  
> **Wiki/Markdown Viewer:** https://github.com/sumitmali411-cyber/vonfluence-wiki-markdown-chalks  
> **Markdown+Mermaid Previewer:** https://github.com/sumitmali411-cyber/markdown-previewer-mermaid

---

## 📐 Tech Stack (Mandatory)

| Layer | Technology |
|-------|-----------|
| **Frontend** | Angular 17+ (standalone components) |
| **UI Library** | PrimeNG 17+ with PrimeFlex CSS |
| **Package Manager** | npm |
| **Backend** | Java 21, Spring Boot 3.x |
| **Database** | MySQL 8.x |
| **ORM** | Spring Data JPA / Hibernate |
| **Auth** | Spring Security + JWT |
| **API** | REST (JSON) |
| **Wiki/Docs** | Markdown + Mermaid (from vonfluence-wiki-markdown-chalks) |
| **Diagrams** | Mermaid.js (from markdown-previewer-mermaid) |

---

## 🗂️ Module Breakdown

| # | Module | Prompt File |
|---|--------|-------------|
| 1 | Project Setup & Architecture | `01-SETUP-ARCHITECTURE.md` |
| 2 | Database Schema (MySQL) | `02-DATABASE-SCHEMA.md` |
| 3 | Java Backend – Core | `03-BACKEND-CORE.md` |
| 4 | Java Backend – APIs | `04-BACKEND-APIS.md` |
| 5 | Angular Frontend – Setup | `05-FRONTEND-SETUP.md` |
| 6 | Angular – PrimeNG Components | `06-PRIMENG-COMPONENTS.md` |
| 7 | Dashboard Module | `07-DASHBOARD.md` |
| 8 | Task Management Module | `08-TASK-MANAGEMENT.md` |
| 9 | Wiki & Markdown Module | `09-WIKI-MARKDOWN.md` |
| 10 | Git/Commit Tracker Module | `10-GIT-COMMIT-TRACKER.md` |
| 11 | Team & Roles Module | `11-TEAM-ROLES.md` |
| 12 | Auth & Security | `12-AUTH-SECURITY.md` |
| 13 | Theming & Design System | `13-THEMING-DESIGN.md` |
| 14 | Testing & CI/CD | `14-TESTING-CICD.md` |

---

## 🎯 Application Vision

A **DevSync-style** unified project tracker inspired by:
- **task-commit-hub (Replit)** — commit/task correlation, team velocity
- **Google Stitch** — clean card-based layouts, sidebar navigation, rich filters
- **Vonfluence Wiki** — Confluence-style wiki with Mermaid diagram support
- **Markdown Mermaid Previewer** — embedded doc previewer inside issues/tasks

### Core Features
- 📋 **Projects** — create, archive, categorize with tags/labels
- ✅ **Tasks/Issues** — Kanban board, list view, priorities, assignees, due dates
- 📝 **Wiki** — Confluence-like markdown editor with Mermaid diagram rendering
- 🔀 **Commit Tracker** — link Git commits to tasks (GitHub/GitLab webhooks)
- 👥 **Teams** — roles (Admin, PM, Dev, Viewer), invitations
- 📊 **Dashboard** — burndown charts, velocity, open vs closed metrics
- 🔔 **Notifications** — in-app, email digest
- 🔍 **Global Search** — tasks, wiki pages, commits

---

## 📁 Repository Structure

```
project-management-app/
├── frontend/                          # Angular 17 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                  # Guards, interceptors, services
│   │   │   ├── shared/                # Shared PrimeNG components
│   │   │   ├── modules/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── projects/
│   │   │   │   ├── tasks/
│   │   │   │   ├── wiki/              # ← pulls from vonfluence-wiki-markdown-chalks
│   │   │   │   ├── commits/           # ← Git commit tracker
│   │   │   │   ├── team/
│   │   │   │   └── settings/
│   │   │   └── layout/                # Sidebar, topbar, breadcrumb
│   │   ├── assets/
│   │   └── environments/
│   ├── package.json
│   └── angular.json
│
├── backend/                           # Spring Boot 3 app
│   ├── src/main/java/com/devapp/
│   │   ├── config/                    # Security, CORS, JPA
│   │   ├── controller/                # REST controllers
│   │   ├── service/                   # Business logic
│   │   ├── repository/                # JPA repositories
│   │   ├── model/                     # JPA entities
│   │   ├── dto/                       # Request/Response DTOs
│   │   ├── security/                  # JWT filter, UserDetailsService
│   │   └── exception/                 # Global exception handler
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/              # Flyway SQL scripts
│   └── pom.xml
│
├── docs/                              # Markdown documentation
│   ├── wiki/                          # Uses vonfluence-wiki-markdown-chalks format
│   └── diagrams/                      # Mermaid .mmd files
│
└── README.md
```

---

## 🔗 Sub-Repos to Pull & Integrate

### 1. `vonfluence-wiki-markdown-chalks`
```bash
# In frontend/src/app/modules/wiki/
git clone https://github.com/sumitmali411-cyber/vonfluence-wiki-markdown-chalks temp-wiki
# Copy: confluenceParser.js → wiki.service.ts (port to Angular service)
# Copy: mermaidLoader.js → mermaid.service.ts
# Copy: styles.css → wiki.component.scss
# Copy: index.html → wiki-editor.component.html (adapt to Angular template)
```

### 2. `markdown-previewer-mermaid`
```bash
# In frontend/src/app/modules/wiki/ (for .md file preview)
git clone https://github.com/sumitmali411-cyber/markdown-previewer-mermaid temp-md
# Port app.js logic to markdown-preview.component.ts
# Port mermaidLoader.js to shared mermaid.service.ts
# Use exportService.js for PDF export button in Angular
```

---

## 🚦 Getting Started (Quick Commands)

```bash
# Clone
git clone https://github.com/sumitmali411-cyber/Project-management-application
cd Project-management-application

# Frontend
cd frontend
npm install
npm start   # → http://localhost:4200

# Backend
cd backend
./mvnw spring-boot:run   # → http://localhost:8080

# MySQL (Docker)
docker run -d --name devapp-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=devapp \
  -p 3306:3306 mysql:8
```
