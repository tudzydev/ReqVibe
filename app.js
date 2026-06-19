/**
 * ReqVibe - Application Logic File
 * Handles: state management, spreadsheet parsing, NLP heuristics, drag-and-drop, charts, CRUD operations, exports.
 */

// Prevent Lucide CDN failures from blocking Javascript execution
if (typeof lucide === "undefined") {
    window.lucide = {
        createIcons: function() {
            console.warn("Lucide icons script failed to load. Icons will not display, but the application functions normally.");
        }
    };
}

// Application State
let state = {
    requirements: [],
    groups: ["ความปลอดภัย", "ระบบการชำระเงิน", "ฟีเจอร์หลัก", "การจัดการผู้ใช้งาน", "ระบบวิเคราะห์ข้อมูล"], // Default groups
    activeTab: "analytics",
    theme: "light",
    sorting: { column: "id", direction: "asc" },
    filters: { search: "", group: "", priority: "", status: "", fnSearch: "" },
    sourceName: "ไม่ได้เชื่อมต่อแหล่งข้อมูล",
    aiInsights: null,
    isSurveyForm: false,
    lastAiProposedCard: null
};

// Global Chart References
let charts = {
    priority: null,
    status: null,
    groups: null
};

// DOM Elements
const elements = {
    // Screens
    setupScreen: document.getElementById("setup-screen"),
    dashboardScreen: document.getElementById("dashboard-screen"),
    
    // Header Actions
    btnLoadDemo: document.getElementById("btn-load-demo"),
    btnReset: document.getElementById("btn-reset"),
    themeToggle: document.getElementById("theme-toggle"),
    mobileMenuToggle: document.getElementById("mobile-menu-toggle"),
    sidebarOverlay: document.getElementById("sidebar-overlay"),
    
    // Inputs & Setup Controls
    sheetUrl: document.getElementById("sheet-url"),
    btnImportSheet: document.getElementById("btn-import-sheet"),
    dropZone: document.getElementById("drop-zone"),
    fileInput: document.getElementById("file-input"),
    pasteArea: document.getElementById("paste-area"),
    btnParsePaste: document.getElementById("btn-parse-paste"),
    
    // Sidebar Info
    sourceNameDisplay: document.getElementById("source-name"),
    sourceCountDisplay: document.getElementById("source-count"),
    navItems: document.querySelectorAll(".nav-item"),
    tabPanels: document.querySelectorAll(".tab-panel"),
    
    // Tab 1: Analytics Stats
    statTotal: document.getElementById("stat-total"),
    statGrouped: document.getElementById("stat-grouped"),
    statGroupedPct: document.getElementById("stat-grouped-pct"),
    statHighPriority: document.getElementById("stat-high-priority"),
    statCompleted: document.getElementById("stat-completed"),
    statCompletedPct: document.getElementById("stat-completed-pct"),
    btnRunAnalysis: document.getElementById("btn-run-analysis"),
    aiSuggestionBox: document.getElementById("ai-suggestion-box"),
    aiResultsBox: document.getElementById("ai-results-box"),
    aiInsightsSummary: document.getElementById("ai-insights-summary"),
    aiSuggestionsList: document.getElementById("ai-suggestions-list"),
    
    // Tab 2: Tabular View Filters & Table
    searchInput: document.getElementById("search-input"),
    filterGroup: document.getElementById("filter-group"),
    filterPriority: document.getElementById("filter-priority"),
    filterStatus: document.getElementById("filter-status"),
    requirementsTable: document.getElementById("requirements-table"),
    requirementsTbody: document.getElementById("requirements-tbody"),
    tableEmpty: document.getElementById("table-empty"),
    btnAddRequirement: document.getElementById("btn-add-requirement"),
    
    // Tab 3: Kanban Grouping
    btnCreateGroup: document.getElementById("btn-create-group"),
    btnAutoGroup: document.getElementById("btn-auto-group"),
    backlogCount: document.getElementById("backlog-count"),
    backlogCards: document.getElementById("backlog-cards"),
    kanbanBoard: document.getElementById("kanban-board"),
    
    // Tab 4: Export & Report
    exportPreview: document.getElementById("export-preview"),
    previewFilename: document.getElementById("preview-filename"),
    btnDownloadExport: document.getElementById("btn-download-export"),
    btnCopyExport: document.getElementById("btn-copy-export"),
    exportOptionBtns: document.querySelectorAll(".export-option-btn"),
    
    // Modals
    requirementModal: document.getElementById("requirement-modal"),
    requirementForm: document.getElementById("requirement-form"),
    modalTitle: document.getElementById("modal-title"),
    reqIdx: document.getElementById("req-idx"),
    reqId: document.getElementById("req-id"),
    reqName: document.getElementById("req-name"),
    reqDescription: document.getElementById("req-description"),
    reqGroup: document.getElementById("req-group"),
    reqPriority: document.getElementById("req-priority"),
    reqStatus: document.getElementById("req-status"),
    btnDeleteReq: document.getElementById("btn-delete-req"),
    btnCancelReq: document.getElementById("btn-cancel-req"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    groupSuggestions: document.getElementById("group-suggestions"),
    
    groupModal: document.getElementById("group-modal"),
    groupForm: document.getElementById("group-form"),
    newGroupName: document.getElementById("new-group-name"),
    btnCancelGroup: document.getElementById("btn-cancel-group"),
    btnCloseGroupModal: document.getElementById("btn-close-group-modal"),
    
    // Tab 5: FN/NF Analysis
    fnSearchInput: document.getElementById("fn-search-input"),
    btnExportFNAnalysis: document.getElementById("btn-export-fnanalysis"),

    // Tab 6: AI Chat & Assistant
    geminiApiKey: document.getElementById("gemini-api-key"),
    btnSaveApiKey: document.getElementById("btn-save-api-key"),
    btnClearApiKey: document.getElementById("btn-clear-api-key"),
    apiKeyStatus: document.getElementById("api-key-status"),
    geminiModel: document.getElementById("gemini-model"),
    btnAiStoryAnalysis: document.getElementById("btn-ai-story-analysis"),
    btnAiArchitecture: document.getElementById("btn-ai-architecture"),
    btnAiGrouping: document.getElementById("btn-ai-grouping"),
    btnAiSurvey: document.getElementById("btn-ai-survey"),
    chatMessagesContainer: document.getElementById("chat-messages-container"),
    chatInput: document.getElementById("chat-input"),
    btnSendChat: document.getElementById("btn-send-chat"),
    aiAnalysisResult: document.getElementById("ai-analysis-result"),
    btnCopyAiResult: document.getElementById("btn-copy-ai-result"),
    btnDownloadAiResult: document.getElementById("btn-download-ai-result"),
    aiCreatorInput: document.getElementById("ai-creator-input"),
    btnAiCreateCard: document.getElementById("btn-ai-create-card"),
    aiCreatedCardPreview: document.getElementById("ai-created-card-preview"),

    // Toast
    toastContainer: document.getElementById("toast-container")
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    initTheme();
    loadFromLocalStorage();
    initAIConfig();
    setupEventListeners();
    updateUI();
});

// Theme Setup (Persist in localStorage)
function initTheme() {
    const savedTheme = localStorage.getItem("reqvibe-theme") || "light";
    state.theme = savedTheme;
    document.body.className = savedTheme + "-theme";
    updateThemeToggleUI();
}

function updateThemeToggleUI() {
    const moon = elements.themeToggle.querySelector(".icon-moon");
    const sun = elements.themeToggle.querySelector(".icon-sun");
    if (state.theme === "dark") {
        document.body.classList.add("dark-theme");
        document.body.classList.remove("light-theme");
    } else {
        document.body.classList.add("light-theme");
        document.body.classList.remove("dark-theme");
    }
}

// Event Listeners setup
function setupEventListeners() {
    // Theme Switcher
    elements.themeToggle.addEventListener("click", () => {
        state.theme = state.theme === "dark" ? "light" : "dark";
        localStorage.setItem("reqvibe-theme", state.theme);
        updateThemeToggleUI();
    });

    // Demo Data Loader
    elements.btnLoadDemo.addEventListener("click", () => {
        if (typeof window.DEMO_REQUIREMENTS !== "undefined") {
            state.requirements = JSON.parse(JSON.stringify(window.DEMO_REQUIREMENTS));
            // Gather unique groups from demo data (excluding Unassigned)
            const demoGroups = new Set();
            state.requirements.forEach(r => {
                if (r.group && r.group !== "Unassigned") demoGroups.add(r.group);
            });
            state.groups = Array.from(demoGroups);
            state.isSurveyForm = state.requirements.some(r => r.id.startsWith("RESP-"));
            state.sourceName = state.isSurveyForm ? "แบบฟอร์มสำรวจ Interview X" : "ข้อมูลบอร์ดจำลองตัวอย่าง";
            saveToLocalStorage();
            showToast("โหลดข้อมูลตัวอย่างความต้องการเข้าระบบแล้ว!", "success");
            elements.setupScreen.classList.add("hidden");
            elements.dashboardScreen.classList.remove("hidden");
            elements.btnReset.classList.remove("hidden");
            updateUI();
            switchTab("analytics");
        } else {
            showToast("ไม่พบข้อมูลตัวอย่าง กรุณารีเฟรชหน้าเว็บ", "danger");
        }
    });

    // Reset App
    elements.btnReset.addEventListener("click", () => {
        if (confirm("คุณแน่ใจหรือไม่ที่จะล้างความต้องการทั้งหมดและรีเซ็ตพื้นที่ทำงาน?")) {
            localStorage.removeItem("reqvibe-workspace");
            state.requirements = [];
            state.groups = ["ความปลอดภัย", "ระบบการชำระเงิน", "ฟีเจอร์หลัก", "การจัดการผู้ใช้งาน", "ระบบวิเคราะห์ข้อมูล"];
            state.sourceName = "ไม่ได้เชื่อมต่อแหล่งข้อมูล";
            state.aiInsights = null;
            state.isSurveyForm = false;
            elements.setupScreen.classList.remove("hidden");
            elements.dashboardScreen.classList.add("hidden");
            elements.btnReset.classList.add("hidden");
            elements.pasteArea.value = "";
            elements.sheetUrl.value = "";
            document.body.classList.remove("dashboard-active");
            showToast("ล้างข้อมูลและรีเซ็ตพื้นที่ทำงานเรียบร้อยแล้ว", "info");
        }
    });

    // Google Sheets URL Import
    elements.btnImportSheet.addEventListener("click", fetchGoogleSheet);

    // File Drop Zone
    elements.dropZone.addEventListener("click", () => elements.fileInput.click());
    elements.fileInput.addEventListener("change", handleFileSelect);

    elements.dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        elements.dropZone.classList.add("dragover");
    });
    elements.dropZone.addEventListener("dragleave", () => {
        elements.dropZone.classList.remove("dragover");
    });
    elements.dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            elements.fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });

    // Paste Area parsing
    elements.btnParsePaste.addEventListener("click", handlePasteParse);

    // Sidebar navigation tabs
    elements.navItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabName = item.getAttribute("data-tab");
            switchTab(tabName);
            document.body.classList.remove("sidebar-open");
        });
    });

    // Mobile menu toggle
    if (elements.mobileMenuToggle) {
        elements.mobileMenuToggle.addEventListener("click", () => {
            document.body.classList.toggle("sidebar-open");
        });
    }

    // Mobile sidebar overlay backdrop click to close
    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.addEventListener("click", () => {
            document.body.classList.remove("sidebar-open");
        });
    }

    // AI suggestion click
    elements.btnRunAnalysis.addEventListener("click", runAIRequirementClustering);

    // Apply auto-grouping recommendations
    elements.btnAutoGroup.addEventListener("click", () => {
        if (!state.aiInsights || !state.aiInsights.suggestions) {
            runAIRequirementClustering();
            return;
        }
        applyAISuggestions();
    });

    // Search and Filters in tabular view
    elements.searchInput.addEventListener("input", (e) => {
        state.filters.search = e.target.value.toLowerCase();
        renderTabularView();
    });
    elements.filterGroup.addEventListener("change", (e) => {
        state.filters.group = e.target.value;
        renderTabularView();
    });
    elements.filterPriority.addEventListener("change", (e) => {
        state.filters.priority = e.target.value;
        renderTabularView();
    });
    elements.filterStatus.addEventListener("change", (e) => {
        state.filters.status = e.target.value;
        renderTabularView();
    });

    // Table sorting header click listeners
    elements.requirementsTable.querySelectorAll("thead th[data-sort]").forEach(th => {
        th.addEventListener("click", () => {
            const column = th.getAttribute("data-sort");
            if (state.sorting.column === column) {
                state.sorting.direction = state.sorting.direction === "asc" ? "desc" : "asc";
            } else {
                state.sorting.column = column;
                state.sorting.direction = "asc";
            }
            // Reset headers icon
            renderTabularView();
        });
    });

    // Add requirement button modal open
    elements.btnAddRequirement.addEventListener("click", () => openRequirementModal(null));

    // Modal forms cancel/close
    elements.btnCloseModal.addEventListener("click", closeRequirementModal);
    elements.btnCancelReq.addEventListener("click", closeRequirementModal);
    elements.requirementForm.addEventListener("submit", saveRequirement);
    elements.btnDeleteReq.addEventListener("click", deleteRequirement);

    // Create custom group button
    elements.btnCreateGroup.addEventListener("click", () => {
        elements.groupModal.classList.remove("hidden");
        elements.newGroupName.value = "";
        elements.newGroupName.focus();
    });
    elements.btnCancelGroup.addEventListener("click", () => elements.groupModal.classList.add("hidden"));
    elements.btnCloseGroupModal.addEventListener("click", () => elements.groupModal.classList.add("hidden"));
    elements.groupForm.addEventListener("submit", createNewGroup);

    // Export Option switching
    elements.exportOptionBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            elements.exportOptionBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderExportTab();
        });
    });

    // Export Actions
    elements.btnDownloadExport.addEventListener("click", downloadExportFile);
    elements.btnCopyExport.addEventListener("click", copyExportToClipboard);

    // Setup drag & drop global handler on window for kanban elements
    elements.kanbanBoard.addEventListener("dragover", handleDragOverColumn);
    elements.kanbanBoard.addEventListener("drop", handleDropColumn);
    elements.backlogCards.addEventListener("dragover", handleDragOverColumn);
    elements.backlogCards.addEventListener("drop", handleDropColumn);

    // Tab 5: FN/NF Analysis Search & Export
    if (elements.fnSearchInput) {
        elements.fnSearchInput.addEventListener("input", (e) => {
            state.filters.fnSearch = e.target.value;
            renderFNAnalysisView();
        });
    }
    if (elements.btnExportFNAnalysis) {
        elements.btnExportFNAnalysis.addEventListener("click", exportFNAnalysis);
    }

    // Tab 6: AI Chat & Key Configuration
    if (elements.btnSaveApiKey) {
        elements.btnSaveApiKey.addEventListener("click", saveApiKey);
    }
    if (elements.btnClearApiKey) {
        elements.btnClearApiKey.addEventListener("click", clearApiKey);
    }
    if (elements.geminiModel) {
        elements.geminiModel.addEventListener("change", (e) => {
            localStorage.setItem("reqvibe-gemini-model", e.target.value);
            const savedKey = localStorage.getItem("reqvibe-gemini-key") || "";
            updateApiKeyStatusUI(savedKey);
        });
    }

    // AI Analysis Trigger Buttons
    if (elements.btnAiStoryAnalysis) {
        elements.btnAiStoryAnalysis.addEventListener("click", () => runDeepAIAnalysis("story"));
    }
    if (elements.btnAiArchitecture) {
        elements.btnAiArchitecture.addEventListener("click", () => runDeepAIAnalysis("architecture"));
    }
    if (elements.btnAiGrouping) {
        elements.btnAiGrouping.addEventListener("click", () => runDeepAIAnalysis("grouping"));
    }
    if (elements.btnAiSurvey) {
        elements.btnAiSurvey.addEventListener("click", () => runDeepAIAnalysis("survey"));
    }

    // Copy / Download AI Result
    if (elements.btnCopyAiResult) {
        elements.btnCopyAiResult.addEventListener("click", copyAIResult);
    }
    if (elements.btnDownloadAiResult) {
        elements.btnDownloadAiResult.addEventListener("click", downloadAIResult);
    }

    // Chat Interface Sending
    if (elements.btnSendChat) {
        elements.btnSendChat.addEventListener("click", sendChatMessage);
    }
    if (elements.chatInput) {
        elements.chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }

    // Chat Quick Tags
    document.querySelectorAll(".quick-tag-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const query = btn.getAttribute("data-query") || btn.textContent.trim();
            if (elements.chatInput) {
                elements.chatInput.value = query;
                sendChatMessage();
            }
        });
    });

    // AI Card Creator
    if (elements.btnAiCreateCard) {
        elements.btnAiCreateCard.addEventListener("click", runAiCardCreator);
    }
    if (elements.aiCreatorInput) {
        elements.aiCreatorInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                runAiCardCreator();
            }
        });
    }
}

// Switching between navigation panels
function switchTab(tabName) {
    state.activeTab = tabName;
    
    // Update navigation active item
    elements.navItems.forEach(item => {
        if (item.getAttribute("data-tab") === tabName) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Show/Hide Panels
    elements.tabPanels.forEach(panel => {
        if (panel.id === `tab-${tabName}`) {
            panel.classList.add("active");
        } else {
            panel.classList.remove("active");
        }
    });

    // Populate elements or draw elements when entering tabs
    if (tabName === "analytics") {
        renderAnalyticsView();
    } else if (tabName === "tabular") {
        renderTabularView();
    } else if (tabName === "grouping") {
        renderGroupingBoard();
    } else if (tabName === "export") {
        renderExportTab();
    } else if (tabName === "fnanalysis") {
        renderFNAnalysisView();
    } else if (tabName === "aichat") {
        renderAIChatTab();
    }
}

// Toast Notifications Helper
function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconName = "info";
    if (type === "success") iconName = "check-circle";
    if (type === "danger") iconName = "x-circle";
    if (type === "warning") iconName = "alert-triangle";
    
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    lucide.createIcons({ attrs: { class: 'toast-icon' } });
    
    // Automatically delete after 4.5 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px)";
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// LocalStorage helpers
function saveToLocalStorage() {
    localStorage.setItem("reqvibe-workspace", JSON.stringify({
        requirements: state.requirements,
        groups: state.groups,
        sourceName: state.sourceName,
        isSurveyForm: state.isSurveyForm
    }));
}

function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem("reqvibe-workspace");
        if (stored) {
            const parsed = JSON.parse(stored);
            state.requirements = parsed.requirements || [];
            state.groups = parsed.groups || [];
            state.sourceName = parsed.sourceName || "ไม่ได้เชื่อมต่อแหล่งข้อมูล";
            state.isSurveyForm = parsed.isSurveyForm || false;
            
            if (state.requirements.length > 0) {
                elements.setupScreen.classList.add("hidden");
                elements.dashboardScreen.classList.remove("hidden");
                elements.btnReset.classList.remove("hidden");
            }
        }
    } catch (e) {
        console.error("Error loading localStorage data", e);
    }
}

// Core parsing logic
// Parse CSV Text into array of arrays
function parseCSVContent(text) {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        let c = text[i];
        let next = text[i+1];
        if (c === '"') {
            if (inQuotes && next === '"') {
                row[row.length - 1] += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            row.push('');
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && next === '\n') { i++; }
            lines.push(row);
            row = [''];
        } else {
            row[row.length - 1] += c;
        }
    }
    if (row.length > 1 || row[0] !== '') {
        lines.push(row);
    }
    return lines;
}

// Convert parsed grid array into requirement objects with mapping
function importFromGrid(grid, sourceName = "Imported File") {
    if (grid.length < 2) {
        showToast("The document seems empty or has insufficient rows.", "danger");
        return;
    }

    // Clean grid rows (strip empty lines)
    const cleanGrid = grid.map(r => r.map(cell => cell ? cell.trim() : "")).filter(row => row.some(cell => cell !== ""));
    const headers = cleanGrid[0];
    
    // Detect if this is the specific Interview X Survey Form
    const isSurvey = headers.some(h => 
        h.includes("สถานะปัจจุบันของคุณ") || 
        h.includes("สัมภาษณ์ที่คุณสนใจ") || 
        h.includes("ปัญหาหลักที่คุณพบ") || 
        h.includes("ระบบช่วยฝึกสัมภาษณ์")
    );

    if (isSurvey) {
        importSurveyGrid(cleanGrid, sourceName);
        return;
    }
    
    state.isSurveyForm = false;
    
    // Find column indexes
    let idIdx = -1;
    let titleIdx = -1;
    let descIdx = -1;
    let prioIdx = -1;
    let statusIdx = -1;
    let groupIdx = -1;

    for (let i = 0; i < headers.length; i++) {
        const h = headers[i].toLowerCase();
        if (h === "id" || h === "req id" || h === "requirement id" || h === "#" || h === "number") idIdx = i;
        else if (h.includes("title") || h.includes("name") || h.includes("summary") || h === "requirement") titleIdx = i;
        else if (h.includes("desc") || h.includes("details") || h === "body") descIdx = i;
        else if (h.includes("priority") || h === "prio" || h === "p") prioIdx = i;
        else if (h.includes("status") || h.includes("state") || h === "stage") statusIdx = i;
        else if (h.includes("group") || h.includes("category") || h === "module" || h === "epic" || h === "section") groupIdx = i;
    }

    // Fallbacks if columns are not found
    if (titleIdx === -1) {
        // Find first string column
        titleIdx = cleanGrid[1].findIndex(cell => cell.length > 5);
        if (titleIdx === -1) titleIdx = 0;
    }

    const importedReqs = [];
    const detectedGroups = new Set();

    for (let i = 1; i < cleanGrid.length; i++) {
        const row = cleanGrid[i];
        if (!row || row.length === 0) continue;

        let id = idIdx !== -1 && row[idIdx] ? row[idIdx] : `REQ-${String(i).padStart(3, '0')}`;
        let title = titleIdx !== -1 && row[titleIdx] ? row[titleIdx] : `Requirement ${id}`;
        let desc = descIdx !== -1 && row[descIdx] ? row[descIdx] : "";
        
        let priority = "Medium";
        if (prioIdx !== -1 && row[prioIdx]) {
            const rawPrio = row[prioIdx].toLowerCase();
            if (rawPrio.includes("high") || rawPrio.includes("สูง") || rawPrio === "h" || rawPrio === "1" || rawPrio === "p1") priority = "High";
            else if (rawPrio.includes("low") || rawPrio.includes("ต่ำ") || rawPrio === "l" || rawPrio === "3" || rawPrio === "p3") priority = "Low";
            else priority = "Medium";
        }

        let status = "To Do";
        if (statusIdx !== -1 && row[statusIdx]) {
            const rawStatus = row[statusIdx].toLowerCase();
            if (rawStatus.includes("done") || rawStatus.includes("เสร็จ") || rawStatus.includes("สำเร็จ") || rawStatus.includes("complete") || rawStatus === "finished" || rawStatus === "resolved") status = "Done";
            else if (rawStatus.includes("prog") || rawStatus.includes("ทำ") || rawStatus === "doing" || rawStatus === "active" || rawStatus === "started") status = "In Progress";
            else status = "To Do";
        }

        let group = "Unassigned";
        if (groupIdx !== -1 && row[groupIdx]) {
            const val = row[groupIdx].trim();
            if (val && val.toLowerCase() !== "unassigned" && val !== "ยังไม่ได้จัดกลุ่ม" && val !== "-" && val !== "") {
                group = val;
                detectedGroups.add(val);
            }
        }

        importedReqs.push({ id, title, description: desc, priority, status, group });
    }

    // Update state
    state.requirements = importedReqs;
    state.groups = detectedGroups.size > 0 ? Array.from(detectedGroups) : ["ความปลอดภัย", "ระบบการชำระเงิน", "ฟีเจอร์หลัก", "การจัดการผู้ใช้งาน", "ระบบวิเคราะห์ข้อมูล"];
    state.sourceName = sourceName;
    state.aiInsights = null; // Clear old AI insights

    saveToLocalStorage();
    showToast(`นำเข้าข้อมูลความต้องการ ${importedReqs.length} รายการแล้ว`, "success");
    
    // Transition Screen
    elements.setupScreen.classList.add("hidden");
    elements.dashboardScreen.classList.remove("hidden");
    elements.btnReset.classList.remove("hidden");
    
    updateUI();
}

function importSurveyGrid(grid, sourceName) {
    const importedReqs = [];
    const detectedGroups = new Set([
        "ระบบจำลองสัมภาษณ์",
        "การให้คะแนนและคำแนะนำ (AI)",
        "ฝึกภาษาอังกฤษและไวยากรณ์",
        "ทักษะสื่อสารและความมั่นใจ",
        "แดชบอร์ดติดตามพัฒนาการ",
        "การฝึกผ่านเสียงพูด",
        "การเตรียมตัวทั่วไป"
    ]);

    for (let i = 1; i < grid.length; i++) {
        const row = grid[i];
        if (!row || row.length < 5 || row.join("") === "") continue;

        const id = `RESP-${String(i).padStart(3, '0')}`;
        
        // Title: Status + Primary Interest
        const userStatus = row[1] || "ผู้ใช้ทั่วไป";
        const interestStr = row[2] || "";
        const interest = interestStr.split(",")[0] || "ทั่วไป";
        const title = `${userStatus} - ${interest}`;

        // Description compilation
        let desc = "";
        if (row[4]) desc += `ปัญหา: ${row[4]}\n`;
        if (row[5]) desc += `กังวลที่สุด: ${row[5]}\n`;
        if (row[10]) desc += `ข้อจำกัดเตรียมตัว: ${row[10]}\n`;
        if (row[11]) desc += `ฟีเจอร์ที่ต้องการ: ${row[11]}\n`;
        if (row[14]) desc += `คาดหวัง: ${row[14]}`;

        // Priority based on AI Interest (Col 16)
        let priority = "Medium";
        const interestLevel = row[16] || "";
        if (interestLevel.includes("มากที่สุด") || interestLevel.includes("มาก")) priority = "High";
        else if (interestLevel.includes("น้อย") || interestLevel.includes("ไม่สนใจ")) priority = "Low";

        // Status based on Consent (Col 20)
        let statusVal = "To Do";
        const consent = row[20] || "";
        if (consent.includes("ยินยอม")) statusVal = "Done";

        // Primary Group allocation based on column 11 features selected
        let group = "การเตรียมตัวทั่วไป";
        const features = row[11] || "";
        if (features.includes("วิเคราะห์ภาษาอังกฤษ")) group = "ฝึกภาษาอังกฤษและไวยากรณ์";
        else if (features.includes("วิเคราะห์การสื่อสาร")) group = "ทักษะสื่อสารและความมั่นใจ";
        else if (features.includes("Dashboard ติดตามพัฒนาการ")) group = "แดชบอร์ดติดตามพัฒนาการ";
        else if (features.includes("จำลองคำถาม")) group = "ระบบจำลองสัมภาษณ์";
        else if (features.includes("ให้คะแนนและ feedback")) group = "การให้คะแนนและคำแนะนำ (AI)";
        else if (features.includes("ฝึกผ่านเสียงพูด")) group = "การฝึกผ่านเสียงพูด";

        importedReqs.push({
            id,
            title,
            description: desc,
            priority,
            status: statusVal,
            group,
            rawStatus: row[1],
            rawInterest: row[2],
            rawProblems: row[4],
            rawFeatures: row[11],
            rawUsedAI: row[15],
            rawConcerns: row[17],
            rawConsent: row[20]
        });
    }

    state.requirements = importedReqs;
    state.groups = Array.from(detectedGroups);
    state.sourceName = "แบบฟอร์มสำรวจ Interview X";
    state.isSurveyForm = true;
    state.aiInsights = null;

    saveToLocalStorage();
    showToast(`นำเข้าข้อมูลและจัดประเภทผลสำรวจ ${importedReqs.length} รายการแล้ว!`, "success");
    
    // Transition Screen
    elements.setupScreen.classList.add("hidden");
    elements.dashboardScreen.classList.remove("hidden");
    elements.btnReset.classList.remove("hidden");
    
    updateUI();
    switchTab("analytics");
}

// Google Sheets Import trigger
function fetchGoogleSheet() {
    let url = elements.sheetUrl.value.trim();
    if (!url) {
        showToast("กรุณากรอกลิงก์ Google Sheets ที่ถูกต้อง", "warning");
        return;
    }

    // Attempt to extract sheet ID
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
        showToast("ไม่สามารถระบุ ID สเปรดชีตได้ กรุณาตรวจสอบลิงก์อีกครั้ง", "danger");
        return;
    }

    const spreadsheetId = sheetIdMatch[1];
    
    // Extract gid if exists
    let gid = "0";
    const gidMatch = url.match(/gid=([0-9]+)/);
    if (gidMatch) {
        gid = gidMatch[1];
    }

    // Direct CSV export URL
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    
    elements.btnImportSheet.disabled = true;
    elements.btnImportSheet.innerHTML = `
        <div class="loader-spinner"></div>
        <span>กำลังดึงข้อมูล...</span>
    `;

    showToast("กำลังเชื่อมต่อ Google Sheets...", "info");

    fetch(csvExportUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok. Status: " + response.status);
            }
            return response.text();
        })
        .then(csvText => {
            const grid = parseCSVContent(csvText);
            importFromGrid(grid, "Google Sheets (สด)");
        })
        .catch(err => {
            console.error("CORS block or spreadsheet not shared correctly:", err);
            showToast("ดึงข้อมูลไม่สำเร็จ! ตรวจสอบว่าเปิดแชร์สิทธิ์เป็น 'ทุกคนที่มีลิงก์สามารถดูได้' แล้วหรือไม่", "danger");
            
            // Offer fallback advice in input box description
            elements.sheetUrl.value = "";
            elements.sheetUrl.placeholder = "CORS ถูกบล็อก ให้ใช้วิธีคัดลอกและวางเซลล์ด้านล่างแทน!";
        })
        .finally(() => {
            elements.btnImportSheet.disabled = false;
            elements.btnImportSheet.innerHTML = `
                <span>ดึงข้อมูล</span>
                <i data-lucide="arrow-right"></i>
            `;
            lucide.createIcons();
        });
}

// CSV File Upload trigger
function handleFileSelect() {
    const file = elements.fileInput.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
        showToast("กรุณาเลือกไฟล์ .csv ที่ถูกต้อง", "warning");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        
        // Auto-detect decoding error (replacement characters indicate a mismatched UTF-8 decoding)
        if (text.includes('\uFFFD')) {
            console.log("Decoding error. Re-reading file as Windows-874 (Thai encoding)...");
            const secondaryReader = new FileReader();
            secondaryReader.onload = function(ev) {
                const tisText = ev.target.result;
                const grid = parseCSVContent(tisText);
                importFromGrid(grid, file.name);
            };
            secondaryReader.readAsText(file, 'windows-874');
        } else {
            const grid = parseCSVContent(text);
            importFromGrid(grid, file.name);
        }
    };
    reader.readAsText(file, 'utf-8');
}

// Paste Box trigger
function handlePasteParse() {
    const pasteText = elements.pasteArea.value.trim();
    if (!pasteText) {
        showToast("กรุณาคัดลอกเซลล์ใน Google Sheets แล้ววางลงในกล่องข้อความก่อน", "warning");
        return;
    }

    // Parse Tab Separated Values (TSV)
    const rows = pasteText.split(/\r?\n/).map(line => line.split("\t"));
    importFromGrid(rows, "ข้อมูลที่วางจากสเปรดชีต");
}

// Global UI refresh (binds header counters & updates tabs if visible)
function updateUI() {
    if (state.requirements.length > 0) {
        document.body.classList.add("dashboard-active");
    } else {
        document.body.classList.remove("dashboard-active");
    }
    
    elements.sourceNameDisplay.textContent = state.sourceName;
    elements.sourceCountDisplay.textContent = `นำเข้าข้อมูลแล้ว ${state.requirements.length} รายการ`;
    
    // Fill Group Filters dynamically
    const filterGroupVal = elements.filterGroup.value;
    elements.filterGroup.innerHTML = '<option value="">ทุกกลุ่ม / โมดูล</option><option value="Unassigned">ยังไม่ได้จัดกลุ่ม</option>';
    state.groups.forEach(g => {
        elements.filterGroup.innerHTML += `<option value="${g}">${g}</option>`;
    });
    // Restore value if existed
    elements.filterGroup.value = filterGroupVal;

    // Fill datalist suggestions for edit forms
    elements.groupSuggestions.innerHTML = "";
    state.groups.forEach(g => {
        elements.groupSuggestions.innerHTML += `<option value="${g}">`;
    });

    // Refresh active panel data
    switchTab(state.activeTab);
}

// ==========================================================================
// TAB 1: ANALYTICS DASHBOARD
// ==========================================================================
function renderAnalyticsView() {
    const total = state.requirements.length;
    const groupedCount = state.requirements.filter(r => r.group && r.group !== "Unassigned").length;
    const highPrioCount = state.requirements.filter(r => r.priority === "High").length;
    const completedCount = state.requirements.filter(r => r.status === "Done").length;

    elements.statTotal.textContent = total;
    elements.statGrouped.textContent = groupedCount;
    elements.statGroupedPct.textContent = total > 0 ? `${Math.round((groupedCount/total)*100)}% of total` : "0%";
    elements.statHighPriority.textContent = highPrioCount;
    elements.statCompleted.textContent = completedCount;
    elements.statCompletedPct.textContent = total > 0 ? `${Math.round((completedCount/total)*100)}% of total` : "0%";

    // Draw Charts
    renderPriorityChart();
    renderStatusChart();
    renderGroupsBarChart();

    // Reset smart suggestion box if no insights loaded
    if (state.aiInsights) {
        elements.aiSuggestionBox.classList.add("hidden");
        elements.aiResultsBox.classList.remove("hidden");
        renderAIResultsUI();
    } else {
        elements.aiSuggestionBox.classList.remove("hidden");
        elements.aiResultsBox.classList.add("hidden");
    }
}

// Helper to destroy charts cleanly
function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
        charts[name] = null;
    }
}

// Chart.js renderers
function renderPriorityChart() {
    destroyChart("priority");
    const ctx = document.getElementById("chart-priority").getContext("2d");
    const isDark = state.theme === "dark";

    if (state.isSurveyForm) {
        const counts = {};
        state.requirements.forEach(r => {
            const val = r.rawStatus || "Unknown";
            counts[val] = (counts[val] || 0) + 1;
        });

        const labels = Object.keys(counts);
        const data = Object.values(counts);

        charts.priority = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#6366f1', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981'],
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'ข้อมูลโปรไฟล์ของผู้ตอบแบบสอบถาม (User Profile)', color: isDark ? '#e2e8f0' : '#0f172a' },
                    legend: {
                        position: 'bottom',
                        labels: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Inter' } }
                    }
                },
                cutout: '60%'
            }
        });
    } else {
        const count = { High: 0, Medium: 0, Low: 0 };
        state.requirements.forEach(r => {
            if (count[r.priority] !== undefined) count[r.priority]++;
        });

        charts.priority = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['ระดับความสำคัญสูง', 'ระดับความสำคัญปานกลาง', 'ระดับความสำคัญต่ำ'],
                datasets: [{
                    data: [count.High, count.Medium, count.Low],
                    backgroundColor: [
                        '#ef4444', // Red
                        '#f59e0b', // Amber/Orange
                        '#3b82f6'  // Blue
                    ],
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Inter' } }
                    }
                },
                cutout: '65%'
            }
        });
    }
}

function renderStatusChart() {
    destroyChart("status");
    const ctx = document.getElementById("chart-status").getContext("2d");
    const isDark = state.theme === "dark";

    if (state.isSurveyForm) {
        const counts = { "เคยใช้ AI": 0, "ไม่เคยใช้ AI": 0 };
        state.requirements.forEach(r => {
            const val = r.rawUsedAI || "";
            if (val.includes("เคย") && !val.includes("ไม่เคย")) {
                counts["เคยใช้ AI"]++;
            } else {
                counts["ไม่เคยใช้ AI"]++;
            }
        });

        charts.status = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'ประวัติการเตรียมสัมภาษณ์ด้วยเครื่องมือ AI', color: isDark ? '#e2e8f0' : '#0f172a' },
                    legend: {
                        position: 'bottom',
                        labels: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Inter' } }
                    }
                }
            }
        });
    } else {
        const count = { "To Do": 0, "In Progress": 0, "Done": 0 };
        state.requirements.forEach(r => {
            if (count[r.status] !== undefined) count[r.status]++;
        });

        charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['ยังไม่ได้เริ่ม (To Do)', 'กำลังทำ (In Progress)', 'เสร็จสิ้น (Done)'],
                datasets: [{
                    data: [count["To Do"], count["In Progress"], count["Done"]],
                    backgroundColor: [
                        '#94a3b8', // Slate
                        '#8b5cf6', // Violet
                        '#10b981'  // Emerald
                    ],
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Inter' } }
                    }
                },
                cutout: '65%'
            }
        });
    }
}

function renderGroupsBarChart() {
    destroyChart("groups");
    const ctx = document.getElementById("chart-groups").getContext("2d");
    const isDark = state.theme === "dark";

    if (state.isSurveyForm) {
        const featureCounts = {};
        state.requirements.forEach(r => {
            const feats = r.rawFeatures || "";
            feats.split(",").map(f => f.trim()).forEach(f => {
                if (!f) return;
                featureCounts[f] = (featureCounts[f] || 0) + 1;
            });
        });

        const sortedFeatures = Object.keys(featureCounts)
            .map(key => ({ name: key, count: featureCounts[key] }))
            .sort((a, b) => b.count - a.count);

        const labels = sortedFeatures.map(f => f.name);
        const data = sortedFeatures.map(f => f.count);

        charts.groups = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'จำนวนผู้ต้องการ (คน)',
                    data: data,
                    backgroundColor: 'rgba(6, 182, 212, 0.7)',
                    borderColor: '#06b6d4',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    title: { display: true, text: 'ฟีเจอร์ของระบบที่ผู้ใช้ต้องการมากที่สุด', color: isDark ? '#e2e8f0' : '#0f172a' },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Inter' } },
                        grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        ticks: { 
                            color: isDark ? '#94a3b8' : '#64748b', 
                            font: { family: 'Inter', size: 10 }
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    } else {
        const count = { "Unassigned": 0 };
        state.groups.forEach(g => { count[g] = 0; });
        
        state.requirements.forEach(r => {
            const grp = r.group || "Unassigned";
            if (count[grp] !== undefined) {
                count[grp]++;
            } else {
                count[grp] = 1;
            }
        });

        const labels = Object.keys(count).filter(l => count[l] > 0 || l !== "Unassigned");
        const data = labels.map(l => count[l]);

        charts.groups = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'จำนวนความต้องการ (รายการ)',
                    data: data,
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: '#6366f1',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Horizontal bars
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Inter' } },
                        grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Inter' } },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

// Smart Requirements Clustering (Local Natural Language processing model simulation)
// Smart Requirements Clustering (Gemini API or Local Natural Language processing model simulation fallback)
function runAIRequirementClustering() {
    if (state.requirements.length === 0) {
        showToast("กรุณานำเข้าข้อมูลความต้องการหรือผลสำรวจก่อน", "warning");
        return;
    }

    const apiKey = localStorage.getItem("reqvibe-gemini-key");
    if (apiKey) {
        // Run Real Gemini API clustering!
        elements.btnRunAnalysis.disabled = true;
        elements.btnRunAnalysis.innerHTML = `
            <div class="loader-spinner"></div>
            <span>กำลังใช้ Gemini AI วิเคราะห์...</span>
        `;
        showToast("กำลังเรียกใช้ Gemini API เพื่อวิเคราะห์จัดกลุ่มตามจริง...", "info");

        const prompt = `คุณคือ Product Owner และ System Analyst มืออาชีพ
กรุณาทำความเข้าใจและวิเคราะห์ข้อกำหนดความต้องการ (Requirements) หรือผลการสำรวจจำนวนทั้งหมด ${state.requirements.length} รายการต่อไปนี้

และนำเสนอแนวทางการจัดกลุ่มฟีเจอร์/โมดูลระบบที่ดีที่สุด โดยให้สกัดหัวข้อกลุ่มออกเป็นไม่เกิน 6-8 กลุ่มโมดูลหลัก และจัดสรรข้อกำหนดความต้องการแต่ละรายการเข้าไปยังกลุ่มเหล่านั้นตามความเหมาะสมที่สุด (Semantic Clustering)

ข้อมูลความต้องการระบบ (Requirements Data):
${serializeRequirementsForAI()}

คุณจะต้องส่งคืนคำตอบในรูปแบบ JSON เท่านั้น โดยห้ามมีข้อความอธิบายอื่นนอก JSON (เช่น Markdown formatting \`\`\`json หรือคำอธิบายภายนอก) รูปแบบโครงสร้าง JSON ที่คุณต้องปฏิบัติตามมีดังนี้:
{
  "summary": "ข้อความสรุปวิเคราะห์ข้อมูลความต้องการของโครงการและทิศทางหลักแบบภาพรวม (1-2 ย่อหน้าเป็นภาษาไทย)",
  "groups": [
    {
      "groupName": "ชื่อกลุ่มโมดูลที่แนะนำ (ภาษาไทย)",
      "reason": "เหตุผลสั้นๆ ที่แนะนำให้จัดกลุ่มนี้และเชื่อมโยงกับฟีเจอร์หลัก (ภาษาไทย)",
      "reqIds": ["REQ-001", "REQ-002", ...]
    }
  ]
}

โปรดระวัง: รายการ reqIds จะต้องมีอยู่จริงในรหัสข้อกำหนดที่ส่งไปให้ ห้ามสร้างรหัสใหม่ที่ไม่ได้ระบุเด็ดขาด!`;

        const systemInstruction = "คุณคือระบบ AI ประมวลผลและจัดกลุ่มความต้องการระบบซอฟต์แวร์ คืนค่าเฉพาะ JSON ตามรูปแบบที่ระบุเท่านั้น";
        
        callGeminiAPIJson(prompt, systemInstruction)
            .then(result => {
                if (!result.groups || !Array.isArray(result.groups)) {
                    throw new Error("โครงสร้างผลลัพธ์จาก AI ไม่ถูกต้อง");
                }

                state.aiInsights = {
                    isSurvey: state.isSurveyForm,
                    summary: result.summary || `สกัดกลุ่มโมดูลสอดคล้องความต้องการทั้งหมดด้วย AI เรียบร้อยแล้ว`,
                    suggestions: result.groups.map(g => {
                        return {
                            groupName: g.groupName,
                            reason: g.reason || `แนะนำสำหรับการจัดกลุ่มความต้องการระบบตามความเหมาะสม`,
                            reqIds: g.reqIds || [],
                            sampleKeywords: [g.groupName]
                        };
                    }),
                    unmatchedCount: state.requirements.length - result.groups.reduce((acc, g) => acc + (g.reqIds ? g.reqIds.length : 0), 0)
                };

                // UI toggles
                elements.aiSuggestionBox.classList.add("hidden");
                elements.aiResultsBox.classList.remove("hidden");
                
                renderAIResultsUI();
                
                elements.btnRunAnalysis.disabled = false;
                elements.btnRunAnalysis.innerHTML = `
                    <i data-lucide="sparkles"></i> วิเคราะห์และจัดกลุ่มอัตโนมัติ
                `;
                lucide.createIcons();
                showToast("เรียกใช้ Gemini AI ประมวลผลจัดกลุ่มจริงเรียบร้อยแล้ว!", "success");
            })
            .catch(err => {
                console.error("Gemini Grouping error:", err);
                showToast(`เกิดข้อผิดพลาดในการจัดกลุ่มด้วย AI: ${err.message}. จะใช้การวิเคราะห์จำลองแทน`, "danger");
                runLocalHeuristicGrouping();
            });
        return;
    }

    // Default to Heuristic local simulation
    runLocalHeuristicGrouping();
}

function runLocalHeuristicGrouping() {
    elements.btnRunAnalysis.disabled = true;
    elements.btnRunAnalysis.innerHTML = `
        <div class="loader-spinner"></div>
        <span>กำลังวิเคราะห์ข้อมูล...</span>
    `;

    showToast("คำแนะนำ: กำลังใช้การวิเคราะห์จำลอง (Heuristics) ท้องถิ่น คุณสามารถใส่ API Key ในแท็บผู้ช่วย AI เพื่อวิเคราะห์จริง", "warning");

    setTimeout(() => {
        if (state.isSurveyForm) {
            const total = state.requirements.length;
            
            // 1. Status aggregates
            const statusCounts = {};
            state.requirements.forEach(r => {
                const status = r.rawStatus || "Unknown";
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            const topStatus = Object.keys(statusCounts).sort((a,b) => statusCounts[b] - statusCounts[a])[0] || "Unknown";
            const topStatusPct = Math.round((statusCounts[topStatus]/total)*100);

            // 2. Anxiety aggregates
            let englishAnxietyCount = 0;
            state.requirements.forEach(r => {
                const desc = r.description.toLowerCase();
                if (desc.includes("ภาษาอังกฤษ") || desc.includes("english")) englishAnxietyCount++;
            });
            const englishPct = Math.round((englishAnxietyCount/total)*100);

            // 3. Concerns aggregates
            const concernCounts = {};
            state.requirements.forEach(r => {
                const concerns = r.rawConcerns || "";
                concerns.split(",").map(c => c.trim()).forEach(c => {
                    if (!c) return;
                    concernCounts[c] = (concernCounts[c] || 0) + 1;
                });
            });
            const topConcern = Object.keys(concernCounts).sort((a,b) => concernCounts[b] - concernCounts[a])[0] || "None";
            const topConcernPct = Math.round((concernCounts[topConcern]/total)*100);

            // Generate suggestions list based on survey insights
            const suggestions = [
                {
                    groupName: "ฝึกภาษาอังกฤษและไวยากรณ์",
                    reason: `ผู้ตอบแบบสอบถามกว่า ${englishPct}% ระบุว่าทักษะภาษาอังกฤษเป็นอุปสรรคสำคัญในการสัมภาษณ์ แนะนำให้จัดลำดับความสำคัญของโมดูลระบบการจำลองการตอบแบบสองภาษา (Bilingual/English)`,
                    reqIds: state.requirements.filter(r => r.description.includes("ภาษาอังกฤษ")).map(r => r.id).slice(0, 5)
                },
                {
                    groupName: "การให้คะแนนและคำแนะนำ (AI)",
                    reason: `ความกังวลผู้ใช้: ผู้ใช้กว่า ${topConcernPct}% กกังวลเกี่ยวกับเรื่อง "${topConcern}" แนะนำให้พัฒนาระบบตรวจสอบความแม่นยำของ AI Feedback และอธิบายเกณฑ์คะแนนอย่างชัดเจน`,
                    reqIds: state.requirements.filter(r => r.rawConcerns && r.rawConcerns.includes(topConcern)).map(r => r.id).slice(0, 5)
                },
                {
                    groupName: "สถานะผู้ใช้: " + topStatus,
                    reason: `กลุ่ม Demographic หลัก: ผู้ตอบแบบสอบถามกว่า ${topStatusPct}% มีสถานะเป็น "${topStatus}" แนะนำให้ออกแบบเทมเพลตคำถามสำหรับการสมัครงานแรกหรือเริ่มสัมภาษณ์ในระดับเริ่มต้น`,
                    reqIds: state.requirements.filter(r => r.rawStatus === topStatus).map(r => r.id).slice(0, 5)
                }
            ];

            state.aiInsights = {
                isSurvey: true,
                summary: `วิเคราะห์ผลสำรวจจากผู้ตอบแบบสอบถามทั้งหมด ${total} คน พบว่ากลุ่มเป้าหมายหลักคือ <strong>${topStatus}</strong> (${topStatusPct}%) โดยฟีเจอร์ที่เรียกร้องมากที่สุดคือระบบฝึกและวิเคราะห์ความมั่นใจผ่านเสียง และปัญหาหลักคือความมั่นใจด้านภาษาอังกฤษ`,
                suggestions: suggestions
            };

        } else {
            // Define Theme Cluster words
            const clusters = [
                {
                    name: "ระบบล็อกอินและความปลอดภัย",
                    keywords: ["auth", "login", "password", "mfa", "permission", "role", "security", "encryption", "rbac", "oauth", "token", "sign", "verify"],
                    matches: []
                },
                {
                    name: "การชำระเงินและสมัครสมาชิก",
                    keywords: ["billing", "payment", "invoice", "stripe", "price", "card", "checkout", "subscription", "charge", "refund"],
                    matches: []
                },
                {
                    name: "ฐานข้อมูลและโครงสร้างพื้นฐาน",
                    keywords: ["database", "backup", "aws", "s3", "cron", "storage", "sql", "migration", "server", "cache", "performance"],
                    matches: []
                },
                {
                    name: "การจัดการผู้ใช้งาน",
                    keywords: ["user", "profile", "avatar", "account", "settings", "member", "preferences", "details", "contact"],
                    matches: []
                },
                {
                    name: "แดชบอร์ดสถิติและรายงาน",
                    keywords: ["analytics", "chart", "report", "dashboard", "metric", "graph", "statistics", "telemetry", "log"],
                    matches: []
                },
                {
                    name: "บริการเชื่อมต่อภายนอก (API)",
                    keywords: ["api", "webhook", "integration", "rest", "endpoint", "sdk", "service", "sync", "export", "import"],
                    matches: []
                }
            ];

            let unassignedMatches = [];

            state.requirements.forEach(req => {
                const titleTokens = req.title.toLowerCase().split(/[\s,.\-\/()]+/);
                const descTokens = req.description.toLowerCase().split(/[\s,.\-\/()]+/);
                const allTokens = [...titleTokens, ...descTokens];

                let bestCluster = null;
                let maxMatches = 0;

                clusters.forEach(cluster => {
                    let matchCount = 0;
                    cluster.keywords.forEach(keyword => {
                        if (allTokens.includes(keyword)) {
                            matchCount++;
                        }
                    });

                    if (matchCount > maxMatches) {
                        maxMatches = matchCount;
                        bestCluster = cluster;
                    }
                });

                if (bestCluster && maxMatches > 0) {
                    bestCluster.matches.push({ req: req, matchesCount: maxMatches });
                } else {
                    unassignedMatches.push(req);
                }
            });

            // Filter out empty suggestions
            const suggestions = clusters
                .filter(c => c.matches.length > 0)
                .map(c => {
                    return {
                        groupName: c.name,
                        reqIds: c.matches.map(m => m.req.id),
                        sampleKeywords: c.keywords.filter(k => 
                            c.matches.some(m => 
                                m.req.title.toLowerCase().includes(k) || m.req.description.toLowerCase().includes(k)
                            )
                        ).slice(0, 3)
                    };
                });

            state.aiInsights = {
                suggestions: suggestions,
                unmatchedCount: unassignedMatches.length
            };
        }

        // UI toggles
        elements.aiSuggestionBox.classList.add("hidden");
        elements.aiResultsBox.classList.remove("hidden");
        
        renderAIResultsUI();
        
        elements.btnRunAnalysis.disabled = false;
        elements.btnRunAnalysis.innerHTML = `
            <i data-lucide="sparkles"></i> วิเคราะห์และจัดกลุ่มอัตโนมัติ
        `;
        lucide.createIcons();
        showToast("ประมวลผลวิเคราะห์การจัดกลุ่มจำลองเรียบร้อยแล้ว!", "success");
    }, 1200);
}

function renderAIResultsUI() {
    const totalReqs = state.requirements.length;
    
    if (state.aiInsights.isSurvey) {
        elements.aiInsightsSummary.innerHTML = `
            <h4>สรุปรายงานผลสำรวจผู้ตอบแบบสอบถาม</h4>
            <p>${state.aiInsights.summary}</p>
        `;

        elements.aiSuggestionsList.innerHTML = "";
        state.aiInsights.suggestions.forEach((sugg, i) => {
            elements.aiSuggestionsList.innerHTML += `
                <div class="suggestion-item">
                    <div class="suggestion-info">
                        <h5>แนะนำโมดูลแยกกลุ่ม: "${sugg.groupName}"</h5>
                        <p>${sugg.reason}</p>
                        <p class="match-reason">มีผลกับ: ${sugg.reqIds.join(", ")}...</p>
                    </div>
                    <button class="btn btn-secondary btn-apply-single-group" data-index="${i}">
                        จัดกลุ่มรายการกลุ่มนี้
                    </button>
                </div>
            `;
        });
        
        // Add individual listener to single group buttons
        document.querySelectorAll(".btn-apply-single-group").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const index = e.target.getAttribute("data-index");
                applySingleAISuggestion(index);
            });
        });
        return;
    }

    const suggestedCount = state.aiInsights.suggestions.reduce((acc, curr) => acc + curr.reqIds.length, 0);
    
    elements.aiInsightsSummary.innerHTML = `
        <h4>ผลการประมวลผลวิเคราะห์</h4>
        <p>เราค้นพบความต้องการเข้าธีม <strong>${state.aiInsights.suggestions.length} กลุ่มโมดูลหลัก</strong> แนะนำให้คุณจัดกลุ่มความต้องการระบบทั้งหมด <strong>${suggestedCount} จาก ${totalReqs} รายการ</strong> ตามความสอดคล้องของคำหลัก ส่วนที่เหลืออีก ${state.aiInsights.unmatchedCount} รายการจะถูกคงเดิมไว้</p>
    `;

    elements.aiSuggestionsList.innerHTML = "";
    state.aiInsights.suggestions.forEach((sugg, i) => {
        elements.aiSuggestionsList.innerHTML += `
            <div class="suggestion-item">
                <div class="suggestion-info">
                    <h5>จัดกลุ่มเป็น "${sugg.groupName}"</h5>
                    <p>มีข้อกำหนด ${sugg.reqIds.length} รายการที่ตรงเงื่อนไข เช่น ${sugg.reqIds.slice(0, 3).join(", ")}</p>
                    <span class="match-reason">คำหลักที่สอดคล้อง: ${sugg.sampleKeywords.join(", ")}</span>
                </div>
                <button class="btn btn-secondary btn-apply-single-group" data-index="${i}">
                    จัดกลุ่มนี้
                </button>
            </div>
        `;
    });

    // Add individual listener to single group buttons
    document.querySelectorAll(".btn-apply-single-group").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = e.target.getAttribute("data-index");
            applySingleAISuggestion(index);
        });
    });
}

function applySingleAISuggestion(index) {
    const sugg = state.aiInsights.suggestions[index];
    if (!sugg) return;

    // Add group if it doesn't exist
    if (!state.groups.includes(sugg.groupName)) {
        state.groups.push(sugg.groupName);
    }

    // Assign requirements
    state.requirements.forEach(r => {
        if (sugg.reqIds.includes(r.id)) {
            r.group = sugg.groupName;
        }
    });

    // Remove this suggestion from state
    state.aiInsights.suggestions.splice(index, 1);
    
    saveToLocalStorage();
    showToast(`จัดกลุ่มความต้องการภายใต้ "${sugg.groupName}" เรียบร้อยแล้ว!`, "success");
    updateUI();
}

function applyAISuggestions() {
    if (!state.aiInsights || !state.aiInsights.suggestions) return;

    state.aiInsights.suggestions.forEach(sugg => {
        if (!state.groups.includes(sugg.groupName)) {
            state.groups.push(sugg.groupName);
        }
        state.requirements.forEach(r => {
            if (sugg.reqIds.includes(r.id)) {
                r.group = sugg.groupName;
            }
        });
    });

    state.aiInsights = null; // Clear suggestions
    
    saveToLocalStorage();
    showToast("นำการแนะนำการจัดกลุ่มทั้งหมดไปใช้เรียบร้อยแล้ว!", "success");
    updateUI();
}

// ==========================================================================
// TAB 2: TABULAR VIEW
// ==========================================================================
function renderTabularView() {
    // Get filter parameters
    const search = state.filters.search;
    const groupFilter = state.filters.group;
    const priorityFilter = state.filters.priority;
    const statusFilter = state.filters.status;

    // Filter array
    let filtered = state.requirements.filter(r => {
        const matchesSearch = r.id.toLowerCase().includes(search) || 
                              r.title.toLowerCase().includes(search) || 
                              r.description.toLowerCase().includes(search);
        
        const matchesGroup = groupFilter === "" ? true : 
                             (groupFilter === "Unassigned" ? (r.group === "Unassigned" || !r.group) : r.group === groupFilter);
                             
        const matchesPriority = priorityFilter === "" ? true : r.priority === priorityFilter;
        const matchesStatus = statusFilter === "" ? true : r.status === statusFilter;

        return matchesSearch && matchesGroup && matchesPriority && matchesStatus;
    });

    // Sort array
    const col = state.sorting.column;
    const dir = state.sorting.direction === "asc" ? 1 : -1;

    filtered.sort((a, b) => {
        let valA = a[col] || "";
        let valB = b[col] || "";
        
        // Handle numerical sorting for REQ-XXX
        if (col === "id") {
            const numA = parseInt(valA.replace(/\D/g, "")) || 0;
            const numB = parseInt(valB.replace(/\D/g, "")) || 0;
            return (numA - numB) * dir;
        }

        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });

    // Update Sorting Headers UI
    elements.requirementsTable.querySelectorAll("thead th[data-sort]").forEach(th => {
        const thCol = th.getAttribute("data-sort");
        const icon = th.querySelector("i");
        if (thCol === col) {
            icon.setAttribute("data-lucide", state.sorting.direction === "asc" ? "chevron-up" : "chevron-down");
        } else {
            icon.setAttribute("data-lucide", "chevrons-up-down");
        }
    });
    lucide.createIcons();

    // Render Table Body
    elements.requirementsTbody.innerHTML = "";
    
    if (filtered.length === 0) {
        elements.tableEmpty.classList.remove("hidden");
        elements.requirementsTable.classList.add("hidden");
        return;
    }

    elements.tableEmpty.classList.add("hidden");
    elements.requirementsTable.classList.remove("hidden");

    filtered.forEach(req => {
        // Find index of req in master array
        const masterIdx = state.requirements.findIndex(r => r.id === req.id);

        const tr = document.createElement("tr");
        
        let priorityClass = req.priority.toLowerCase();
        let statusClass = req.status.toLowerCase().replace(" ", "-");
        
        let priorityText = req.priority === 'High' ? 'สูง' : (req.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
        let statusText = req.status === 'Done' ? 'เสร็จสิ้น' : (req.status === 'In Progress' ? 'กำลังทำ' : 'ยังไม่ได้เริ่ม');
        let groupText = (req.group && req.group !== 'Unassigned') ? req.group : 'ยังไม่ได้จัดกลุ่ม';
        
        tr.innerHTML = `
            <td class="req-id-tag">${req.id}</td>
            <td><strong>${req.title}</strong></td>
            <td><p class="table-desc" title="${req.description}">${req.description || '-'}</p></td>
            <td><span class="badge-group">${groupText}</span></td>
            <td><span class="badge-priority ${priorityClass}">${priorityText}</span></td>
            <td><span class="badge-status ${statusClass}">${statusText}</span></td>
            <td class="actions-cell">
                <div class="actions-cell-inner">
                    <button class="btn-icon btn-edit-row" data-idx="${masterIdx}" title="แก้ไขรายละเอียดความต้องการ">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn-icon btn-delete-row text-danger" data-idx="${masterIdx}" title="ลบความต้องการ">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;

        tr.style.cursor = "pointer";
        tr.addEventListener("click", (e) => {
            // If click is on actions cell or inside it, don't trigger edit
            if (e.target.closest(".actions-cell") || e.target.closest(".btn-delete-row") || e.target.closest(".btn-edit-row")) {
                return;
            }
            openRequirementModal(masterIdx);
        });

        elements.requirementsTbody.appendChild(tr);
    });

    // Re-create icons for table items
    lucide.createIcons({ attrs: { class: 'table-action-icon' } });

    // Table edit/delete button attachments
    document.querySelectorAll(".btn-edit-row").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = btn.getAttribute("data-idx");
            openRequirementModal(parseInt(idx));
        });
    });

    document.querySelectorAll(".btn-delete-row").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-idx"));
            if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบความต้องการ ${state.requirements[idx].id}?`)) {
                state.requirements.splice(idx, 1);
                saveToLocalStorage();
                showToast("ลบความต้องการเรียบร้อยแล้ว", "info");
                updateUI();
            }
        });
    });
}

// ==========================================================================
// TAB 3: KANBAN GROUPING BOARD
// ==========================================================================
function renderGroupingBoard() {
    // Render Unassigned pool
    const unassigned = state.requirements.filter(r => !r.group || r.group === "Unassigned");
    elements.backlogCount.textContent = unassigned.length;
    
    elements.backlogCards.innerHTML = "";
    if (unassigned.length === 0) {
        elements.backlogCards.innerHTML = `
            <div class="column-empty-state">
                <i data-lucide="check-square"></i>
                <p>จัดกลุ่มรายการทั้งหมดเสร็จสิ้น!</p>
            </div>
        `;
    } else {
        unassigned.forEach(req => {
            elements.backlogCards.appendChild(createRequirementCard(req));
        });
    }

    // Render columns
    elements.kanbanBoard.innerHTML = "";
    
    state.groups.forEach((groupName, grpIdx) => {
        const groupReqs = state.requirements.filter(r => r.group === groupName);
        
        const col = document.createElement("div");
        col.className = "kanban-column";
        
        col.innerHTML = `
            <div class="column-header">
                <div class="column-title-area">
                    <span class="badge bg-indigo">${groupReqs.length}</span>
                    <h4 title="${groupName}">${groupName}</h4>
                </div>
                <div class="column-actions">
                    <button class="btn-icon btn-rename-group" data-idx="${grpIdx}" title="เปลี่ยนชื่อกลุ่ม">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="btn-icon btn-delete-group text-danger" data-name="${groupName}" title="ลบกลุ่มโมดูลนี้ (ย้ายความต้องการกลับไป Backlog)">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
            <div class="column-cards-container drop-target-column" data-group="${groupName}">
                <!-- Cards will load here -->
            </div>
        `;

        const container = col.querySelector(".column-cards-container");
        if (groupReqs.length === 0) {
            container.innerHTML = `
                <div class="column-empty-state">
                    <i data-lucide="plus-circle"></i>
                    <p>ลากการ์ดมาวางที่นี่</p>
                </div>
            `;
        } else {
            groupReqs.forEach(req => {
                container.appendChild(createRequirementCard(req));
            });
        }

        elements.kanbanBoard.appendChild(col);
    });

    // Add Rename & Delete actions to Columns
    document.querySelectorAll(".btn-rename-group").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-idx"));
            const oldName = state.groups[idx];
            const newName = prompt(`เปลี่ยนชื่อกลุ่ม "${oldName}" เป็น:`, oldName);
            if (newName && newName.trim() !== "" && newName.trim() !== oldName) {
                const cleanNew = newName.trim();
                
                // Rename in groups list
                state.groups[idx] = cleanNew;
                
                // Update requirements matching this group
                state.requirements.forEach(r => {
                    if (r.group === oldName) r.group = cleanNew;
                });

                saveToLocalStorage();
                showToast(`เปลี่ยนชื่อกลุ่มเป็น "${cleanNew}" เรียบร้อยแล้ว!`, "success");
                updateUI();
            }
        });
    });

    document.querySelectorAll(".btn-delete-group").forEach(btn => {
        btn.addEventListener("click", () => {
            const name = btn.getAttribute("data-name");
            if (confirm(`ลบกลุ่ม "${name}" หรือไม่? ความต้องการในกลุ่มนี้จะถูกย้ายกลับไปยังคลังที่ยังไม่ได้จัดกลุ่ม (Backlog)`)) {
                // Remove group
                state.groups = state.groups.filter(g => g !== name);
                
                // Set requirements in group to Unassigned
                state.requirements.forEach(r => {
                    if (r.group === name) r.group = "Unassigned";
                });

                saveToLocalStorage();
                showToast(`ลบกลุ่ม "${name}" เรียบร้อยแล้ว`, "info");
                updateUI();
            }
        });
    });

    lucide.createIcons();
    attachDragEvents();
}

// Card Node Factory
function createRequirementCard(req) {
    const card = document.createElement("div");
    card.className = "requirement-card";
    card.setAttribute("draggable", "true");
    card.setAttribute("data-id", req.id);
    
    let prioClass = req.priority.toLowerCase();
    let statusClass = req.status.toLowerCase().replace(" ", "-");
    
    let priorityText = req.priority === 'High' ? 'สูง' : (req.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
    let statusText = req.status === 'Done' ? 'เสร็จสิ้น' : (req.status === 'In Progress' ? 'กำลังทำ' : 'ยังไม่ได้เริ่ม');
    let descText = req.description || 'ไม่มีรายละเอียดความต้องการ';
    
    card.innerHTML = `
        <div class="card-header-row">
            <span class="card-req-id">${req.id}</span>
            <div class="card-badges">
                <span class="badge-priority ${prioClass}">${priorityText}</span>
            </div>
        </div>
        <h5>${req.title}</h5>
        <p>${descText}</p>
        <div class="card-footer-row">
            <span class="badge-status ${statusClass}">${statusText}</span>
        </div>
    `;

    // Double click to edit card (single click on touch devices)
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice) {
        card.addEventListener("click", () => {
            const masterIdx = state.requirements.findIndex(r => r.id === req.id);
            openRequirementModal(masterIdx);
        });
    } else {
        card.addEventListener("dblclick", () => {
            const masterIdx = state.requirements.findIndex(r => r.id === req.id);
            openRequirementModal(masterIdx);
        });
    }

    return card;
}

// Drag & Drop HTML5 APIs Implementation
let draggedReqId = null;

function attachDragEvents() {
    const cards = document.querySelectorAll(".requirement-card");
    const columns = document.querySelectorAll(".drop-target-column");

    cards.forEach(card => {
        card.addEventListener("dragstart", (e) => {
            draggedReqId = card.getAttribute("data-id");
            card.classList.add("dragging");
            e.dataTransfer.setData("text/plain", draggedReqId);
            e.dataTransfer.effectAllowed = "move";
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("dragging");
            draggedReqId = null;
            
            // Remove all drop-target highlights
            columns.forEach(col => col.classList.remove("dragover-column"));
        });
    });

    columns.forEach(col => {
        col.addEventListener("dragenter", (e) => {
            e.preventDefault();
            col.classList.add("dragover-column");
        });

        col.addEventListener("dragover", (e) => {
            e.preventDefault();
            col.classList.add("dragover-column");
        });

        col.addEventListener("dragleave", () => {
            col.classList.remove("dragover-column");
        });

        col.addEventListener("drop", (e) => {
            e.preventDefault();
            col.classList.remove("dragover-column");
            
            const reqId = e.dataTransfer.getData("text/plain") || draggedReqId;
            const targetGroup = col.getAttribute("data-group");
            
            if (reqId && targetGroup) {
                const req = state.requirements.find(r => r.id === reqId);
                if (req && req.group !== targetGroup) {
                    req.group = targetGroup;
                    saveToLocalStorage();
                    
                    // Trigger dynamic updates
                    renderGroupingBoard();
                    showToast(`ย้าย ${reqId} ไปยังกลุ่ม "${targetGroup}" แล้ว`, "success");
                }
            }
        });
    });
}

function handleDragOverColumn(e) {
    e.preventDefault();
}

function handleDropColumn(e) {
    e.preventDefault();
}

// Create Custom Group form submit
function createNewGroup(e) {
    e.preventDefault();
    const name = elements.newGroupName.value.trim();
    if (!name) return;

    if (name.toLowerCase() === "unassigned" || name === "ยังไม่ได้จัดกลุ่ม") {
        showToast("ไม่สามารถสร้างกลุ่มชื่อ 'Unassigned' หรือ 'ยังไม่ได้จัดกลุ่ม' ได้", "warning");
        return;
    }

    if (state.groups.includes(name)) {
        showToast("มีกลุ่มชื่อนี้อยู่แล้วในระบบ", "warning");
        return;
    }

    state.groups.push(name);
    elements.groupModal.classList.add("hidden");
    saveToLocalStorage();
    showToast(`สร้างกลุ่ม "${name}" เรียบร้อยแล้ว!`, "success");
    updateUI();
}

// ==========================================================================
// TAB 4: EXPORT & REPORT GENERATOR
// ==========================================================================
function renderExportTab() {
    const activeBtn = document.querySelector(".export-option-btn.active");
    if (!activeBtn) return;
    
    const format = activeBtn.getAttribute("data-format");
    
    let content = "";
    let filename = "";

    if (format === "markdown") {
        filename = "software_requirements_specification.md";
        content = generateMarkdownSRS();
    } else if (format === "csv") {
        filename = "grouped_requirements.csv";
        content = generateCSVExport();
    } else if (format === "json") {
        filename = "requirements_hierarchy.json";
        content = generateJSONExport();
    } else if (format === "html") {
        filename = "software_requirements_specification.html";
        content = generateHTMLExport();
    }

    elements.previewFilename.textContent = filename;
    elements.exportPreview.textContent = content;
}

// Export Generators
function generateMarkdownSRS() {
    let md = `# เอกสารข้อกำหนดความต้องการซอฟต์แวร์ (SRS)\n`;
    md += `*สร้างขึ้นโดยอัตโนมัติเมื่อวันที่ ${new Date().toLocaleDateString()} จากโครงการ: ${state.sourceName}*\n\n`;
    
    md += `## 1. ภาพรวมของเอกสาร\n`;
    md += `เอกสารฉบับนี้ประกอบด้วยข้อกำหนดความต้องการเชิงฟังก์ชันและเชิงเทคนิคของระบบ โดยจำแนกตามโครงสร้างโมดูลระบบ ได้รับการตรวจสอบและยืนยันแล้วทั้งหมด ${state.requirements.length} รายการ\n\n`;

    // Group items
    const grouped = {};
    state.requirements.forEach(r => {
        const g = r.group || "Unassigned";
        if (!grouped[g]) grouped[g] = [];
        grouped[g].push(r);
    });

    let indexNum = 2;

    // First list standard groups
    state.groups.forEach(g => {
        const reqs = grouped[g] || [];
        if (reqs.length === 0) return;

        md += `## ${indexNum}. โมดูล: ${g}\n`;
        md += `ประกอบด้วยฟีเจอร์และข้อกำหนดทางเทคนิคที่ได้รับมอบหมายให้อยู่ในขอบเขตของโมดูล ${g}\n\n`;

        reqs.forEach(r => {
            let priorityText = r.priority === 'High' ? 'สูง' : (r.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
            let statusText = r.status === 'Done' ? 'เสร็จสิ้น' : (r.status === 'In Progress' ? 'กำลังทำ' : 'ยังไม่ได้เริ่ม');
            md += `### ${r.id}: ${r.title}\n`;
            md += `- **ระดับความสำคัญ:** \`${priorityText}\`\n`;
            md += `- **สถานะการพัฒนา:** \`${statusText}\`\n`;
            md += `- **คำอธิบาย:** ${r.description || "*ไม่มีรายละเอียดความต้องการ*"}\n\n`;
        });

        indexNum++;
    });

    // Handle Unassigned group
    const unassigned = grouped["Unassigned"] || [];
    if (unassigned.length > 0) {
        md += `## ${indexNum}. รายการความต้องการที่ยังไม่ได้จัดกลุ่ม (Product Backlog)\n`;
        md += `รายการความต้องการที่ยังไม่ได้ผ่านการคัดกรองหรือจัดสรรให้กับโมดูลฟีเจอร์ใด ๆ\n\n`;

        unassigned.forEach(r => {
            let priorityText = r.priority === 'High' ? 'สูง' : (r.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
            let statusText = r.status === 'Done' ? 'เสร็จสิ้น' : (r.status === 'In Progress' ? 'กำลังทำ' : 'ยังไม่ได้เริ่ม');
            md += `### ${r.id}: ${r.title}\n`;
            md += `- **ระดับความสำคัญ:** \`${priorityText}\`\n`;
            md += `- **สถานะการพัฒนา:** \`${statusText}\`\n`;
            md += `- **คำอธิบาย:** ${r.description || "*ไม่มีรายละเอียดความต้องการ*"}\n\n`;
        });
    }

    return md;
}

function generateCSVExport() {
    let csv = `"รหัสความต้องการ","หัวข้อ","คำอธิบาย","กลุ่ม/โมดูล","ความสำคัญ","สถานะ"\r\n`;
    
    state.requirements.forEach(r => {
        let priorityText = r.priority === 'High' ? 'สูง' : (r.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
        let statusText = r.status === 'Done' ? 'เสร็จสิ้น' : (r.status === 'In Progress' ? 'กำลังทำ' : 'ยังไม่ได้เริ่ม');
        let groupText = (r.group && r.group !== 'Unassigned') ? r.group : 'ยังไม่ได้จัดกลุ่ม';

        const cleanId = (r.id || "").replace(/"/g, '""');
        const cleanTitle = (r.title || "").replace(/"/g, '""');
        const cleanDesc = (r.description || "").replace(/"/g, '""');
        const cleanGroup = groupText.replace(/"/g, '""');
        const cleanPrio = priorityText.replace(/"/g, '""');
        const cleanStatus = statusText.replace(/"/g, '""');

        csv += `"${cleanId}","${cleanTitle}","${cleanDesc}","${cleanGroup}","${cleanPrio}","${cleanStatus}"\r\n`;
    });

    return csv;
}

function generateJSONExport() {
    const hierarchy = {
        meta: {
            projectName: state.sourceName,
            generatedAt: new Date().toISOString(),
            totalCount: state.requirements.length
        },
        modules: {}
    };

    // Initialize groups
    state.groups.forEach(g => { hierarchy.modules[g] = []; });
    hierarchy.modules["Unassigned"] = [];

    // Map requirements
    state.requirements.forEach(r => {
        const g = r.group || "Unassigned";
        if (!hierarchy.modules[g]) hierarchy.modules[g] = [];
        hierarchy.modules[g].push({
            id: r.id,
            title: r.title,
            description: r.description,
            priority: r.priority,
            status: r.status
        });
    });

    // Remove empty modules
    Object.keys(hierarchy.modules).forEach(key => {
        if (hierarchy.modules[key].length === 0) {
            delete hierarchy.modules[key];
        }
    });

    return JSON.stringify(hierarchy, null, 4);
}

function generateHTMLExport() {
    // Group requirements by module
    const grouped = {};
    state.requirements.forEach(r => {
        const g = r.group || "Unassigned";
        if (!grouped[g]) grouped[g] = [];
        grouped[g].push(r);
    });

    // Calculate statistics
    const totalCount = state.requirements.length;
    const highPriorityCount = state.requirements.filter(r => r.priority === "High").length;
    const completedCount = state.requirements.filter(r => r.status === "Done" || r.status === "เสร็จสิ้น").length;
    const completedPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const activeGroups = state.groups.filter(g => grouped[g] && grouped[g].length > 0);
    const hasUnassigned = grouped["Unassigned"] && grouped["Unassigned"].length > 0;
    const moduleCount = activeGroups.length + (hasUnassigned ? 1 : 0);

    // Build lists for display
    let tocHtml = "";
    let modulesHtml = "";
    let idx = 1;

    // Helper for rendering cards
    const renderCard = (r) => {
        const priorityText = r.priority === 'High' ? 'สูง' : (r.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
        const priorityClass = r.priority.toLowerCase();
        const statusText = r.status === 'Done' ? 'เสร็จสิ้น' : (r.status === 'In Progress' ? 'กำลังทำ' : 'ยังไม่ได้เริ่ม');
        const statusClass = r.status.toLowerCase().replace(" ", "-");
        
        return `
        <div class="req-card">
            <div class="card-header">
                <span class="req-id">${r.id}</span>
                <div class="card-badges">
                    <span class="badge priority-${priorityClass}">${priorityText}</span>
                    <span class="badge status-${statusClass}">${statusText}</span>
                </div>
            </div>
            <h4 class="card-title">${r.title}</h4>
            <p class="card-desc">${r.description || '<em>ไม่มีรายละเอียด</em>'}</p>
        </div>
        `;
    };

    // Process assigned modules
    activeGroups.forEach(g => {
        const reqs = grouped[g] || [];
        tocHtml += `<li><a href="#module-${idx}">โมดูลที่ ${idx}: ${g} (${reqs.length} รายการ)</a></li>`;
        
        modulesHtml += `
        <section id="module-${idx}" class="module-section">
            <div class="module-header">
                <h2>โมดูลที่ ${idx}: ${g}</h2>
                <span class="module-count">${reqs.length} รายการ</span>
            </div>
            <div class="cards-grid">
                ${reqs.map(renderCard).join('')}
            </div>
        </section>
        `;
        idx++;
    });

    // Process unassigned backlog
    if (hasUnassigned) {
        const reqs = grouped["Unassigned"];
        tocHtml += `<li><a href="#module-backlog">รายการรอดำเนินการ (Product Backlog) (${reqs.length} รายการ)</a></li>`;
        
        modulesHtml += `
        <section id="module-backlog" class="module-section">
            <div class="module-header">
                <h2>รายการรอดำเนินการ (Product Backlog)</h2>
                <span class="module-count">${reqs.length} รายการ</span>
            </div>
            <div class="cards-grid">
                ${reqs.map(renderCard).join('')}
            </div>
        </section>
        `;
    }

    // Modern HTML document string with premium styles
    return `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>เอกสารข้อกำหนดความต้องการซอฟต์แวร์ (SRS) - ${state.sourceName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0f172a;
            --surface-color: #1e293b;
            --surface-hover: #334155;
            --border-color: #334155;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --color-primary: #6366f1;
            --color-cyan: #06b6d4;
            --color-rose: #f43f5e;
            --color-emerald: #10b981;
            --color-amber: #f59e0b;
            --radius-lg: 12px;
            --radius-md: 8px;
            --font-main: 'Inter', 'Prompt', 'Sarabun', sans-serif;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-main);
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
            padding: 40px 20px;
        }

        .container {
            max-width: 1100px;
            margin: 0 auto;
        }

        /* Header section */
        header {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 24px;
            margin-bottom: 40px;
            position: relative;
        }

        .actions-bar {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
        }

        .btn-print {
            background-color: var(--color-primary);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: var(--radius-md);
            font-family: var(--font-main);
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .btn-print:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .project-meta {
            font-size: 0.85rem;
            color: var(--color-cyan);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
        }

        h1 {
            font-size: 2.2rem;
            font-weight: 700;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .doc-info {
            display: flex;
            gap: 20px;
            font-size: 0.85rem;
            color: var(--text-muted);
            flex-wrap: wrap;
        }

        .doc-info span {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background-color: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 20px;
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-main);
            margin-bottom: 4px;
        }

        .stat-label {
            font-size: 0.8rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .stat-card.accent {
            border-color: rgba(99, 102, 241, 0.4);
            background: linear-gradient(180deg, var(--surface-color) 0%, rgba(99, 102, 241, 0.05) 100%);
        }

        .stat-card.accent .stat-value {
            color: var(--color-primary);
        }

        /* Table of Contents */
        .toc-card {
            background-color: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 24px;
            margin-bottom: 40px;
        }

        .toc-card h3 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--text-main);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 8px;
        }

        .toc-card ul {
            list-style-type: none;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 10px 20px;
        }

        .toc-card a {
            color: var(--color-cyan);
            text-decoration: none;
            font-size: 0.9rem;
            transition: color 0.2s ease;
        }

        .toc-card a:hover {
            color: var(--color-primary);
            text-decoration: underline;
        }

        /* Module sections */
        .module-section {
            margin-bottom: 48px;
        }

        .module-section {
            page-break-inside: avoid;
        }

        .module-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 12px;
            margin-bottom: 24px;
        }

        .module-header h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-main);
        }

        .module-count {
            font-size: 0.85rem;
            color: var(--text-muted);
            background-color: rgba(255,255,255,0.05);
            padding: 4px 10px;
            border-radius: 12px;
        }

        /* Cards Grid */
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
        }

        .req-card {
            background-color: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .req-card:hover {
            transform: translateY(-2px);
            border-color: var(--surface-hover);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .req-id {
            font-family: monospace;
            font-weight: 700;
            color: var(--text-muted);
            font-size: 0.85rem;
        }

        .card-badges {
            display: flex;
            gap: 6px;
        }

        .badge {
            font-size: 0.7rem;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 4px;
            text-transform: uppercase;
        }

        /* Priority Colors */
        .badge.priority-high { background-color: rgba(244, 63, 94, 0.15); color: var(--color-rose); }
        .badge.priority-medium { background-color: rgba(245, 158, 11, 0.15); color: var(--color-amber); }
        .badge.priority-low { background-color: rgba(16, 185, 129, 0.15); color: var(--color-emerald); }

        /* Status Colors */
        .badge.status-done, .badge.status-เสร็จสิ้น { background-color: rgba(16, 185, 129, 0.1); color: var(--color-emerald); border: 1px solid rgba(16, 185, 129, 0.2); }
        .badge.status-in-progress, .badge.status-กำลังทำ { background-color: rgba(99, 102, 241, 0.1); color: var(--color-primary); border: 1px solid rgba(99, 102, 241, 0.2); }
        .badge.status-to-do, .badge.status-backlog, .badge.status-ยังไม่ได้เริ่ม { background-color: rgba(148, 163, 184, 0.1); color: var(--text-muted); border: 1px solid rgba(148, 163, 184, 0.2); }

        .card-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--text-main);
        }

        .card-desc {
            font-size: 0.85rem;
            color: var(--text-muted);
            white-space: pre-wrap;
            line-height: 1.5;
            flex-grow: 1;
        }

        /* Print styles */
        @media print {
            body {
                background-color: #ffffff;
                color: #000000;
                padding: 0;
            }

            .container {
                max-width: 100%;
            }

            .no-print {
                display: none !important;
            }

            h1 {
                background: none;
                -webkit-text-fill-color: initial;
                color: #000000;
            }

            .stat-card {
                background-color: #ffffff;
                border: 1px solid #cbd5e1;
                color: #000000;
            }

            .stat-card.accent .stat-value {
                color: #000000;
            }

            .toc-card {
                background-color: #ffffff;
                border: 1px solid #cbd5e1;
            }

            .toc-card a {
                color: #0284c7;
            }

            .module-section {
                page-break-inside: avoid;
                page-break-after: auto;
            }

            .req-card {
                background-color: #ffffff;
                border: 1px solid #cbd5e1;
                color: #000000;
                page-break-inside: avoid;
                box-shadow: none;
            }

            .badge {
                border: 1px solid #94a3b8 !important;
                background: none !important;
                color: #000000 !important;
            }

            .card-title {
                color: #000000;
            }

            .card-desc {
                color: #334155;
            }

            .module-header h2 {
                color: #000000;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="actions-bar no-print">
                <button onclick="window.print()" class="btn-print">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    พิมพ์และบันทึกเป็น PDF
                </button>
            </div>
            <div class="project-meta">แหล่งข้อมูล: ${state.sourceName}</div>
            <h1>เอกสารข้อกำหนดความต้องการซอฟต์แวร์ (Software Requirements Specification)</h1>
            <div class="doc-info">
                <span><strong>วันที่ออก:</strong> ${new Date().toLocaleDateString('th-TH')}</span>
                <span><strong>ความต้องการทั้งหมด:</strong> ${totalCount} รายการ</span>
                <span><strong>โมดูล/กลุ่มระบบ:</strong> ${moduleCount} กลุ่ม</span>
            </div>
        </header>

        <section class="stats-grid">
            <div class="stat-card accent">
                <div class="stat-value">${totalCount}</div>
                <div class="stat-label">ความต้องการทั้งหมด</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${moduleCount}</div>
                <div class="stat-label">กลุ่ม/โมดูลระบบ</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${highPriorityCount}</div>
                <div class="stat-label">ความสำคัญสูง (High)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${completedPct}%</div>
                <div class="stat-label">พัฒนาเสร็จสิ้น (${completedCount}/${totalCount})</div>
            </div>
        </section>

        <nav class="toc-card no-print">
            <h3>สารบัญกลุ่มโมดูล</h3>
            <ul>
                ${tocHtml}
            </ul>
        </nav>

        <main>
            ${modulesHtml}
        </main>
    </div>
</body>
</html>`;
}

// Download action trigger
function downloadExportFile() {
    const activeBtn = document.querySelector(".export-option-btn.active");
    if (!activeBtn) return;
    
    const format = activeBtn.getAttribute("data-format");
    const filename = elements.previewFilename.textContent;
    const content = elements.exportPreview.textContent;

    let mime = "text/plain";
    if (format === "markdown") mime = "text/markdown";
    else if (format === "csv") mime = "text/csv";
    else if (format === "json") mime = "application/json";
    else if (format === "html") mime = "text/html";

    const blob = new Blob([content], { type: mime + ";charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว!`, "success");
}

// Copy action trigger
function copyExportToClipboard() {
    const content = elements.exportPreview.textContent;
    
    navigator.clipboard.writeText(content)
        .then(() => {
            showToast("คัดลอกเอกสารลงคลิปบอร์ดแล้ว!", "success");
        })
        .catch(err => {
            console.error("Clipboard copy failed:", err);
            showToast("ไม่สามารถคัดลอกไปยังคลิปบอร์ดโดยอัตโนมัติได้", "danger");
        });
}

// ==========================================================================
// REQUIREMENT CRUD & MODAL CONTROLLERS
// ==========================================================================
function openRequirementModal(idx = null) {
    elements.requirementModal.classList.remove("hidden");
    elements.requirementForm.reset();

    if (idx !== null) {
        // Edit mode
        elements.modalTitle.textContent = "แก้ไขรายละเอียดความต้องการ";
        elements.reqIdx.value = idx;
        
        const req = state.requirements[idx];
        elements.reqId.value = req.id;
        elements.reqId.disabled = true; // Block editing ID to prevent collisions
        elements.reqName.value = req.title;
        elements.reqDescription.value = req.description;
        elements.reqGroup.value = req.group || "Unassigned";
        elements.reqPriority.value = req.priority || "Medium";
        elements.reqStatus.value = req.status || "To Do";
        
        elements.btnDeleteReq.classList.remove("hidden");
    } else {
        // Create mode
        elements.modalTitle.textContent = "เพิ่มความต้องการ";
        elements.reqIdx.value = "";
        
        // Generate new sequential ID
        let maxNum = 0;
        state.requirements.forEach(r => {
            const num = parseInt(r.id.replace(/\D/g, "")) || 0;
            if (num > maxNum) maxNum = num;
        });
        
        elements.reqId.value = `REQ-${String(maxNum + 1).padStart(3, '0')}`;
        elements.reqId.disabled = false;
        elements.btnDeleteReq.classList.add("hidden");
    }
    
    elements.reqName.focus();
}

// Close helper
function closeRequirementModal() {
    elements.requirementModal.classList.add("hidden");
}

// Save helper
function saveRequirement(e) {
    e.preventDefault();

    const idxVal = elements.reqIdx.value;
    const id = elements.reqId.value.trim().toUpperCase();
    const title = elements.reqName.value.trim();
    const desc = elements.reqDescription.value.trim();
    const priority = elements.reqPriority.value;
    const status = elements.reqStatus.value;
    
    let group = elements.reqGroup.value.trim() || "Unassigned";
    if (group.toLowerCase() === "unassigned") group = "Unassigned";

    if (!id || !title) {
        showToast("กรุณากรอกข้อมูลในช่องรหัสและหัวข้อความต้องการ", "warning");
        return;
    }

    // Handle Custom Group Creation inside the Form
    if (group !== "Unassigned" && !state.groups.includes(group)) {
        state.groups.push(group);
    }

    const requirementData = { id, title, description: desc, priority, status, group };

    if (idxVal !== "") {
        // Update existing
        const idx = parseInt(idxVal);
        state.requirements[idx] = requirementData;
        showToast(`อัปเดตความต้องการ ${id} เรียบร้อยแล้ว`, "success");
    } else {
        // Validate unique ID
        if (state.requirements.some(r => r.id === id)) {
            showToast(`ข้อผิดพลาด: มีความต้องการรหัส "${id}" อยู่แล้วในระบบ`, "danger");
            return;
        }
        
        // Insert new
        state.requirements.push(requirementData);
        showToast(`สร้างความต้องการ ${id} เรียบร้อยแล้ว`, "success");
    }

    closeRequirementModal();
    saveToLocalStorage();
    updateUI();
}

// Delete helper
function deleteRequirement() {
    const idxVal = elements.reqIdx.value;
    if (idxVal === "") return;

    const idx = parseInt(idxVal);
    const req = state.requirements[idx];

    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบความต้องการ ${req.id}?`)) {
        state.requirements.splice(idx, 1);
        closeRequirementModal();
        saveToLocalStorage();
        showToast(`ลบความต้องการ ${req.id} เรียบร้อยแล้ว`, "info");
        updateUI();
    }
}

function renderFNAnalysisView() {
    const total = state.requirements.length;
    const frListEl = document.getElementById("functional-list");
    const nfrListEl = document.getElementById("non-functional-list");
    const topListEl = document.getElementById("top-priorities-list");
    
    frListEl.innerHTML = "";
    nfrListEl.innerHTML = "";
    topListEl.innerHTML = "";

    const functionalReqs = [];
    const nonFunctionalReqs = [];
    
    const searchVal = state.filters.fnSearch ? state.filters.fnSearch.toLowerCase().trim() : "";

    // Heuristic Classification into FR and NFR
    state.requirements.forEach(req => {
        const title = req.title.toLowerCase();
        const desc = (req.description || "").toLowerCase();
        const group = (req.group || "").toLowerCase();
        const concerns = (req.rawConcerns || "").toLowerCase();

        // NFR checks: security, payment/billing, cost, performance, accuracy/correctness, privacy, reliability, ease of use
        const isNFR = group.includes("ความปลอดภัย") || 
                      group.includes("ระบบการชำระเงิน") || 
                      group.includes("billing") || 
                      group.includes("security") ||
                      title.includes("mfa") || 
                      title.includes("security") || 
                      title.includes("backup") ||
                      title.includes("privacy") || 
                      title.includes("gdpr") ||
                      desc.includes("ความเสถียร") || 
                      desc.includes("ล่ม") ||
                      desc.includes("ความเป็นส่วนตัว") || 
                      desc.includes("ความแม่นยำ") || 
                      desc.includes("ความถูกต้อง") || 
                      desc.includes("ค่าใช้จ่าย") || 
                      desc.includes("ข้อมูลรั่วไหล") ||
                      desc.includes("ประสิทธิภาพ") ||
                      desc.includes("ความเร็ว") ||
                      desc.includes("เสถียรภาพ") ||
                      desc.includes("สำรองข้อมูล") ||
                      desc.includes("ง่ายต่อการใช้งาน") ||
                      concerns.includes("ความเป็นส่วนตัว") || 
                      concerns.includes("ความแม่นยำ") || 
                      concerns.includes("ความถูกต้อง") || 
                      concerns.includes("ค่าใช้จ่าย") ||
                      concerns.includes("ความยุ่งยาก") ||
                      concerns.includes("ความง่าย");

        const matchesSearch = !searchVal || 
                              req.id.toLowerCase().includes(searchVal) ||
                              req.title.toLowerCase().includes(searchVal) ||
                              (req.description || "").toLowerCase().includes(searchVal) ||
                              (req.group || "").toLowerCase().includes(searchVal);

        if (matchesSearch) {
            if (isNFR) {
                nonFunctionalReqs.push(req);
            } else {
                functionalReqs.push(req);
            }
        }
    });

    document.getElementById("count-fr").textContent = functionalReqs.length;
    document.getElementById("count-nfr").textContent = nonFunctionalReqs.length;

    // Render FR list
    if (functionalReqs.length === 0) {
        frListEl.innerHTML = `<div class="fn-empty">ไม่มีข้อมูลความต้องการเชิงฟังก์ชัน</div>`;
    } else {
        functionalReqs.forEach(req => {
            const item = document.createElement("div");
            item.className = "fn-item";
            let prioText = req.priority === 'High' ? 'สูง' : (req.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
            let priorityClass = req.priority.toLowerCase();
            item.innerHTML = `
                <div class="fn-item-header">
                    <span class="fn-item-id">${req.id}</span>
                    <span class="badge-priority ${priorityClass}">${prioText}</span>
                </div>
                <h4>${req.title}</h4>
                <p>${req.description || '-'}</p>
                <span class="fn-item-meta"><i data-lucide="folder"></i> ${req.group || 'ยังไม่ได้จัดกลุ่ม'}</span>
            `;
            // Open modal on click
            const masterIdx = state.requirements.findIndex(r => r.id === req.id);
            item.addEventListener("click", () => openRequirementModal(masterIdx));
            frListEl.appendChild(item);
        });
    }

    // Render NFR list
    if (nonFunctionalReqs.length === 0) {
        nfrListEl.innerHTML = `<div class="fn-empty">ไม่มีข้อมูลความต้องการที่ไม่ใช่เชิงฟังก์ชัน</div>`;
    } else {
        nonFunctionalReqs.forEach(req => {
            const item = document.createElement("div");
            item.className = "fn-item";
            let prioText = req.priority === 'High' ? 'สูง' : (req.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
            let priorityClass = req.priority.toLowerCase();
            item.innerHTML = `
                <div class="fn-item-header">
                    <span class="fn-item-id">${req.id}</span>
                    <span class="badge-priority ${priorityClass}">${prioText}</span>
                </div>
                <h4>${req.title}</h4>
                <p>${req.description || '-'}</p>
                <span class="fn-item-meta"><i data-lucide="shield"></i> ${req.group || 'ยังไม่ได้จัดกลุ่ม'}</span>
            `;
            // Open modal on click
            const masterIdx = state.requirements.findIndex(r => r.id === req.id);
            item.addEventListener("click", () => openRequirementModal(masterIdx));
            nfrListEl.appendChild(item);
        });
    }

    // Prioritize and get Top 10 matching requirements
    const searchFilteredAll = state.requirements.filter(req => {
        if (!searchVal) return true;
        return req.id.toLowerCase().includes(searchVal) ||
               req.title.toLowerCase().includes(searchVal) ||
               (req.description || "").toLowerCase().includes(searchVal) ||
               (req.group || "").toLowerCase().includes(searchVal);
    });

    const sorted = [...searchFilteredAll].sort((a, b) => {
        const getPrioWeight = (p) => p === 'High' ? 3 : (p === 'Low' ? 1 : 2);
        const getStatusWeight = (s) => s === 'In Progress' ? 3 : (s === 'To Do' ? 2 : 1);
        
        const prioA = getPrioWeight(a.priority);
        const prioB = getPrioWeight(b.priority);
        if (prioA !== prioB) return prioB - prioA; // Higher priority first

        const statusA = getStatusWeight(a.status);
        const statusB = getStatusWeight(b.status);
        if (statusA !== statusB) return statusB - statusA; // In progress / To Do first

        return a.id.localeCompare(b.id);
    });

    const top10 = sorted.slice(0, 10);

    if (top10.length === 0) {
        topListEl.innerHTML = `<div class="fn-empty">ไม่มีข้อมูลความต้องการ</div>`;
    } else {
        top10.forEach((req, idx) => {
            const item = document.createElement("div");
            item.className = "priority-rank-item";
            let prioText = req.priority === 'High' ? 'สูง' : (req.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
            let priorityClass = req.priority.toLowerCase();
            let statusText = req.status === 'Done' ? 'เสร็จสิ้น' : (req.status === 'In Progress' ? 'กำลังทำ' : 'ยังไม่ได้เริ่ม');
            let statusClass = req.status.toLowerCase().replace(" ", "-");
            
            const title = req.title;
            const group = req.group || 'ยังไม่ได้จัดกลุ่ม';
            const rank = idx + 1;
            
            item.innerHTML = `
                <div class="rank-badge">${rank}</div>
                <div class="rank-content">
                    <div class="rank-title-row">
                        <span class="rank-id">${req.id}</span>
                        <h4>${title}</h4>
                        <div class="rank-badges-wrapper">
                            <span class="badge-priority ${priorityClass}">${prioText}</span>
                            <span class="badge-status ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    <p class="rank-desc">${req.description || '-'}</p>
                    <span class="rank-group-tag"><i data-lucide="folder"></i> ${group}</span>
                </div>
            `;
            // Open modal on click
            const masterIdx = state.requirements.findIndex(r => r.id === req.id);
            item.addEventListener("click", () => openRequirementModal(masterIdx));
            topListEl.appendChild(item);
        });
    }

    lucide.createIcons();
}

function exportFNAnalysis() {
    const functionalReqs = [];
    const nonFunctionalReqs = [];
    
    // Heuristic Classification
    state.requirements.forEach(req => {
        const title = req.title.toLowerCase();
        const desc = (req.description || "").toLowerCase();
        const group = (req.group || "").toLowerCase();
        const concerns = (req.rawConcerns || "").toLowerCase();

        const isNFR = group.includes("ความปลอดภัย") || 
                      group.includes("ระบบการชำระเงิน") || 
                      group.includes("billing") || 
                      group.includes("security") ||
                      title.includes("mfa") || 
                      title.includes("security") || 
                      title.includes("backup") ||
                      title.includes("privacy") || 
                      title.includes("gdpr") ||
                      desc.includes("ความเสถียร") || 
                      desc.includes("ล่ม") ||
                      desc.includes("ความเป็นส่วนตัว") || 
                      desc.includes("ความแม่นยำ") || 
                      desc.includes("ความถูกต้อง") || 
                      desc.includes("ค่าใช้จ่าย") || 
                      desc.includes("ข้อมูลรั่วไหล") ||
                      desc.includes("ประสิทธิภาพ") ||
                      desc.includes("ความเร็ว") ||
                      desc.includes("เสถียรภาพ") ||
                      desc.includes("สำรองข้อมูล") ||
                      desc.includes("ง่ายต่อการใช้งาน") ||
                      concerns.includes("ความเป็นส่วนตัว") || 
                      concerns.includes("ความแม่นยำ") || 
                      concerns.includes("ความถูกต้อง") || 
                      concerns.includes("ค่าใช้จ่าย") ||
                      concerns.includes("ความยุ่งยาก") ||
                      concerns.includes("ความง่าย");

        if (isNFR) {
            nonFunctionalReqs.push(req);
        } else {
            functionalReqs.push(req);
        }
    });

    const sorted = [...state.requirements].sort((a, b) => {
        const getPrioWeight = (p) => p === 'High' ? 3 : (p === 'Low' ? 1 : 2);
        const getStatusWeight = (s) => s === 'In Progress' ? 3 : (s === 'To Do' ? 2 : 1);
        
        const prioA = getPrioWeight(a.priority);
        const prioB = getPrioWeight(b.priority);
        if (prioA !== prioB) return prioB - prioA;

        const statusA = getStatusWeight(a.status);
        const statusB = getStatusWeight(b.status);
        if (statusA !== statusB) return statusB - statusA;

        return a.id.localeCompare(b.id);
    });

    const top10 = sorted.slice(0, 10);

    let md = `# รายงานการวิเคราะห์ความต้องการระบบ (Requirements Analysis Report)\n`;
    md += `**แหล่งข้อมูล:** ${state.sourceName}\n`;
    md += `**จำนวนความต้องการทั้งหมด:** ${state.requirements.length} รายการ\n`;
    md += `**วันที่สกัดข้อมูล:** ${new Date().toLocaleDateString('th-TH')}\n\n`;
    md += `---\n\n`;
    md += `## 1. ความต้องการเร่งด่วนสูงสุด 10 อันดับแรก (Top 10 Backlog)\n`;
    md += `| ลำดับ | ID | หัวข้อ | กลุ่ม/โมดูล | ความสำคัญ | สถานะ |\n`;
    md += `| :---: | :--- | :--- | :--- | :---: | :---: |\n`;

    top10.forEach((req, idx) => {
        let prioText = req.priority === 'High' ? 'สูง' : (req.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
        let statusText = req.status === 'Done' ? 'เสร็จสิ้น' : (req.status === 'In Progress' ? 'กำลังทำ' : 'ยังไม่ได้เริ่ม');
        md += `| ${idx + 1} | ${req.id} | ${req.title} | ${req.group || '-'} | ${prioText} | ${statusText} |\n`;
    });

    md += `\n---\n\n`;
    md += `## 2. ข้อกำหนดเชิงฟังก์ชัน (Functional Requirements - FR)\n`;
    md += `> ความสามารถของระบบและโมดูลการทำงานหลักที่ต้องพัฒนา (จำนวน ${functionalReqs.length} รายการ)\n\n`;
    md += `| ID | หัวข้อ | รายละเอียด | กลุ่ม/โมดูล | ความสำคัญ |\n`;
    md += `| :--- | :--- | :--- | :--- | :---: |\n`;

    functionalReqs.forEach(req => {
        let prioText = req.priority === 'High' ? 'สูง' : (req.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
        const desc = (req.description || '-').replace(/\n/g, ' ');
        md += `| ${req.id} | ${req.title} | ${desc} | ${req.group || '-'} | ${prioText} |\n`;
    });

    md += `\n---\n\n`;
    md += `## 3. ข้อกำหนดที่ไม่ใช่เชิงฟังก์ชัน (Non-Functional Requirements - NFR)\n`;
    md += `> คุณสมบัติด้านเสถียรภาพ ประสิทธิภาพ ความปลอดภัย ความเป็นส่วนตัว และค่าใช้จ่าย (จำนวน ${nonFunctionalReqs.length} รายการ)\n\n`;
    md += `| ID | หัวข้อ | รายละเอียด | กลุ่ม/โมดูล | ความสำคัญ |\n`;
    md += `| :--- | :--- | :--- | :--- | :---: |\n`;

    nonFunctionalReqs.forEach(req => {
        let prioText = req.priority === 'High' ? 'สูง' : (req.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
        const desc = (req.description || '-').replace(/\n/g, ' ');
        md += `| ${req.id} | ${req.title} | ${desc} | ${req.group || '-'} | ${prioText} |\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Requirements_Analysis_Report_${new Date().toISOString().slice(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("ส่งออกรายงานการวิเคราะห์ในรูปแบบ Markdown เรียบร้อยแล้ว", "success");
}

// ==========================================================================
// TAB 6: AI CHAT & ASSISTANT LOGIC
// ==========================================================================

function initAIConfig() {
    const savedKey = localStorage.getItem("reqvibe-gemini-key") || "";
    const savedModel = localStorage.getItem("reqvibe-gemini-model") || "gemini-3.5-flash";
    
    if (elements.geminiApiKey) {
        elements.geminiApiKey.value = savedKey;
    }
    if (elements.geminiModel) {
        elements.geminiModel.value = savedModel;
    }
    
    updateApiKeyStatusUI(savedKey);
}

function updateApiKeyStatusUI(apiKey) {
    if (!elements.apiKeyStatus) return;
    
    if (apiKey) {
        elements.apiKeyStatus.className = "api-status-badge connected";
        elements.apiKeyStatus.innerHTML = `
            <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> เชื่อมต่อ Gemini API แล้ว (${localStorage.getItem("reqvibe-gemini-model") || "gemini-3.5-flash"})
        `;
        if (elements.btnClearApiKey) elements.btnClearApiKey.classList.remove("hidden");
    } else {
        elements.apiKeyStatus.className = "api-status-badge disconnected";
        elements.apiKeyStatus.innerHTML = `
            <i data-lucide="alert-circle" style="width: 14px; height: 14px;"></i> ยังไม่ได้เชื่อมต่อ Gemini API (ใช้ Heuristic จำลอง)
        `;
        if (elements.btnClearApiKey) elements.btnClearApiKey.classList.add("hidden");
    }
    lucide.createIcons();
}

function saveApiKey() {
    const key = elements.geminiApiKey.value.trim();
    const model = elements.geminiModel.value;
    
    if (!key) {
        showToast("กรุณาป้อน API Key ก่อนบันทึก", "warning");
        return;
    }
    
    localStorage.setItem("reqvibe-gemini-key", key);
    localStorage.setItem("reqvibe-gemini-model", model);
    updateApiKeyStatusUI(key);
    showToast("บันทึก Gemini API Key สำเร็จ!", "success");
    
    // Update the label in chat as well
    renderAIChatTab();
}

function clearApiKey() {
    localStorage.removeItem("reqvibe-gemini-key");
    if (elements.geminiApiKey) elements.geminiApiKey.value = "";
    updateApiKeyStatusUI("");
    showToast("ลบ API Key เรียบร้อยแล้ว ระบบจะกลับไปใช้ Heuristic จำลอง", "info");
}

function serializeRequirementsForAI() {
    if (!state.requirements || state.requirements.length === 0) return "ไม่มีข้อมูลความต้องการในระบบ";
    
    return state.requirements.map(r => {
        let text = `ID: ${r.id}\nTitle: ${r.title}\nDescription: ${r.description}\nGroup: ${r.group || "Unassigned"}\nPriority: ${r.priority}\nStatus: ${r.status}`;
        if (state.isSurveyForm) {
            text += `\nRaw Status: ${r.rawStatus || ""}\nConcerns: ${r.rawConcerns || ""}`;
        }
        return text;
    }).join("\n---\n");
}

async function callGeminiAPI(prompt, systemInstruction = "") {
    const apiKey = localStorage.getItem("reqvibe-gemini-key");
    if (!apiKey) {
        throw new Error("กรุณาป้อน Gemini API Key ในแท็บผู้ช่วย AI เพื่อเปิดใช้งานการวิเคราะห์ด้วย AI จริง");
    }
    
    const model = localStorage.getItem("reqvibe-gemini-model") || "gemini-3.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: prompt }]
            }
        ]
    };
    
    if (systemInstruction) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        throw new Error(`API Error: ${errorMessage}`);
    }
    
    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
        throw new Error("ไม่สามารถอ่านผลลัพธ์จาก AI Model ได้");
    }
    return candidateText;
}

async function callGeminiAPIJson(prompt, systemInstruction = "") {
    const apiKey = localStorage.getItem("reqvibe-gemini-key");
    if (!apiKey) {
        throw new Error("กรุณาป้อน Gemini API Key ในแท็บผู้ช่วย AI เพื่อเปิดใช้งานการจัดกลุ่มด้วย AI จริง");
    }
    
    const model = localStorage.getItem("reqvibe-gemini-model") || "gemini-3.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: prompt }]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };
    
    if (systemInstruction) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        throw new Error(`API Error: ${errorMessage}`);
    }
    
    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
        throw new Error("ไม่พบผลลัพธ์ JSON ใน AI Model");
    }
    
    return JSON.parse(candidateText.trim());
}

function parseMarkdownToHTML(markdown) {
    if (!markdown) return "";
    
    let html = markdown;
    
    // Escape HTML tags to prevent XSS (except for our generated ones)
    html = html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    // Code blocks: ```language ... ```
    html = html.replace(/```([\w-]*)\n([\s\S]*?)\n```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang}">${code}</code></pre>`;
    });
    
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Headers: # Header
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold: **text** or __text__
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Unordered lists: - item or * item
    html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>');
    
    // Wrap lists in <ul> (heuristically)
    html = html.replace(/(<li>.*<\/li>)/gs, (match) => {
        return `<ul>${match}</ul>`;
    });
    // Remove duplicate consecutive ul/ol wrapping from simple regex
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    
    // Tables
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '';
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
            const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
            if (!inTable) {
                inTable = true;
                tableHtml = '<table><thead><tr>';
                cells.forEach(c => tableHtml += `<th>${c}</th>`);
                tableHtml += '</tr></thead><tbody>';
                if (i + 1 < lines.length && lines[i+1].includes('-')) {
                    i++;
                }
            } else {
                tableHtml += '<tr>';
                cells.forEach(c => {
                    let cleanCell = c
                        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                        .replace(/`([^`]+)`/g, '<code>$1</code>');
                    tableHtml += `<td>${cleanCell}</td>`;
                });
                tableHtml += '</tr>';
            }
        } else {
            if (inTable) {
                inTable = false;
                tableHtml += '</tbody></table>';
                lines[i] = tableHtml + '\n' + lines[i];
                tableHtml = '';
            }
        }
    }
    if (inTable) {
        tableHtml += '</tbody></table>';
        html = lines.join('\n') + tableHtml;
    } else {
        html = lines.join('\n');
    }

    html = html.replace(/\n\n/g, '<p></p>');
    html = html.replace(/\n(?!<pre>)(?!<\/pre>)(?!<li>)(?!<ul>)(?!<\/ul>)(?!<table>)(?!<\/table>)(?!<tr>)(?!<td>)(?!<th>)(?!<thead>)(?!<tbody>)/g, '<br>');

    return html;
}

function renderAIChatTab() {
    const labels = document.querySelectorAll(".ai-req-count-label");
    labels.forEach(l => {
        l.textContent = state.requirements.length;
    });
}

let currentAIResultMarkdown = ""; // Store current markdown output

async function runDeepAIAnalysis(type) {
    if (state.requirements.length === 0) {
        showToast("กรุณานำเข้าข้อมูลความต้องการหรือผลสำรวจก่อนวิเคราะห์", "warning");
        return;
    }

    const apiKey = localStorage.getItem("reqvibe-gemini-key");
    if (!apiKey) {
        showToast("กรุณากรอกและบันทึก Gemini API Key เพื่อเริ่มวิเคราะห์ด้วย AI", "warning");
        switchTab("aichat");
        if (elements.geminiApiKey) elements.geminiApiKey.focus();
        return;
    }

    // Set loading state
    elements.aiAnalysisResult.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); gap: 12px; padding: 20px;">
            <div class="loader-spinner-large"></div>
            <p><strong>Gemini AI กำลังทำการวิเคราะห์เชิงระบบ...</strong></p>
            <p style="font-size: 0.8rem; opacity: 0.8;">ขั้นตอนนี้อาจใช้เวลา 5-15 วินาที ขึ้นอยู่กับรุ่นโมดูลและขนาดของข้อมูลความต้องการ</p>
        </div>
    `;
    
    // Hide Copy/Download buttons during loading
    elements.btnCopyAiResult.classList.add("hidden");
    elements.btnDownloadAiResult.classList.add("hidden");

    let prompt = "";
    let systemInstruction = "คุณคือวิศวกรระบบและนักวิเคราะห์ความต้องการเชิงระบบระดับสูง (Principal System Analyst) ประมวลผลและตอบคำถามเป็นภาษาไทยด้วยความแม่นยำทางวิศวกรรมซอฟต์แวร์";
    
    if (type === "story") {
        prompt = `วิเคราะห์ข้อมูลความต้องการของโครงการจากลิสต์ที่ให้ไว้ และสกัดความต้องการเหล่านั้นเป็น User Stories พร้อมระบุเกณฑ์การยอมรับ (Acceptance Criteria) ในรูปแบบ Given-When-Then สำหรับฟีเจอร์หลักหรือส่วนที่สำคัญที่สุด 5-10 รายการ

ข้อมูลความต้องการโครงการ:
${serializeRequirementsForAI()}

กรุณาจัดรูปแบบคำตอบในสไตล์ Markdown ที่สวยงาม มีระเบียบ มีการใช้ตัวหนา ตาราง และ Bullet points อย่างเป็นมืออาชีพ`;
    } else if (type === "architecture") {
        prompt = `วิเคราะห์ความต้องการระบบต่อไปนี้ และให้คำแนะนำด้านสถาปัตยกรรมและการออกแบบระบบ:
1. การเลือก Architecture (เช่น Microservices หรือ Monolith) และแนะนำเทคโนโลยี/เฟรมเวิร์กที่สอดคล้องกับข้อกำหนด
2. Database Schema Design (วาด Entity-Relationship แบบตัวอักษร หรือทำตารางอธิบาย Database Schema คีย์หลัก คีย์รอง ของตาราง/คอลเลกชันที่จำเป็นอย่างน้อย 3 ตาราง เช่น Users, Sessions, Feedback)
3. การออกแบบระบบ scaling และการจัดทำแคชชิ่ง (Caching / Performance)

ข้อมูลความต้องการโครงการ:
${serializeRequirementsForAI()}

กรุณาจัดรูปแบบคำตอบเป็น Markdown ที่สวยงามและพร้อมสำหรับใส่ใน System Architecture Design Document`;
    } else if (type === "grouping") {
        prompt = `ทำการวิเคราะห์ความต้องการระบบ (System Requirements/Survey Responses) ต่อไปนี้ และเสนอแนวทางการจัดกลุ่มโมดูลของระบบ (System Module Decomposition)
โดยอธิบาย:
1. เสนอแนะกลุ่มโมดูลที่แยก (สูงสุด 6-8 โมดูลหลัก)
2. อธิบายรายละเอียดว่าแต่ละโมดูลตอบสนองฟังก์ชันการทำงานส่วนใด และมีขอบเขต (Scope) อย่างไร
3. แสดงความสัมพันธ์หรือลำดับการพัฒนาโมดูลเหล่านี้ (Roadmap)

ข้อมูลความต้องการโครงการ:
${serializeRequirementsForAI()}

กรุณาสรุปผลเป็นรายงาน Markdown ที่สวยงาม และหากเป็นไปได้ คุณสามารถประมวลผลจัดกลุ่มอัตโนมัติบนบอร์ดโดยกดปุ่ม "วิเคราะห์และจัดกลุ่มอัตโนมัติ" ในแดชบอร์ดหลัก`;
    } else if (type === "survey") {
        prompt = `วิเคราะห์ข้อมูลผลตอบแบบสอบถาม (Survey Responses) ระบบเตรียมสัมภาษณ์งานอัจฉริยะ Interview X ต่อไปนี้ และทำรายงานวิเคราะห์เชิงลึก:
1. สรุปความต้องการเชิงประชากร (User Demographics & Profiles) สรุปเปอร์เซ็นต์หรือแนวโน้มของกลุ่มผู้ตอบ
2. วิเคราะห์ Pain Points และประเด็นความวิตกกังวลหลัก 5 อันดับแรกของผู้ตอบ
3. สรุปฟีเจอร์หรือความต้องการที่ได้รับการเรียกร้อง/แนะนำมากที่สุด (เช่น ด้านทักษะการตอบสัมภาษณ์ภาษาอังกฤษ, ความมั่นใจ)
4. สรุปแนวทางการปรับปรุงระบบ (Actionable Product Recommendations)

ข้อมูลความต้องการสำรวจ:
${serializeRequirementsForAI()}

กรุณาตอบเป็นรายงาน Markdown โครงสร้างสวยงาม อ่านเข้าใจง่าย`;
    }

    try {
        const result = await callGeminiAPI(prompt, systemInstruction);
        currentAIResultMarkdown = result;
        elements.aiAnalysisResult.innerHTML = parseMarkdownToHTML(result);
        
        // Show Copy/Download buttons
        elements.btnCopyAiResult.classList.remove("hidden");
        elements.btnDownloadAiResult.classList.remove("hidden");
        
        showToast("วิเคราะห์ความต้องการด้วย Gemini สำเร็จแล้ว!", "success");
    } catch (e) {
        console.error("AI Analysis Error:", e);
        elements.aiAnalysisResult.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-danger); gap: 12px; text-align: center; padding: 20px;">
                <i data-lucide="x-circle" style="width: 48px; height: 48px;"></i>
                <p><strong>เกิดข้อผิดพลาดในการเรียกใช้ Gemini API</strong></p>
                <p style="font-size: 0.85rem; color: var(--text-muted);">${e.message}</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function copyAIResult() {
    if (!currentAIResultMarkdown) return;
    navigator.clipboard.writeText(currentAIResultMarkdown)
        .then(() => showToast("คัดลอกผลลัพธ์ไปยังคลิปบอร์ดแล้ว!", "success"))
        .catch(() => showToast("ไม่สามารถคัดลอกได้", "danger"));
}

function downloadAIResult() {
    if (!currentAIResultMarkdown) return;
    const blob = new Blob([currentAIResultMarkdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AI_Requirements_Analysis_${new Date().toISOString().slice(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("ดาวน์โหลดรายงาน Markdown สำเร็จ!", "success");
}

async function sendChatMessage() {
    const query = elements.chatInput.value.trim();
    if (!query) return;

    const apiKey = localStorage.getItem("reqvibe-gemini-key");
    if (!apiKey) {
        showToast("กรุณากรอกและบันทึก Gemini API Key ก่อนสนทนา", "warning");
        if (elements.geminiApiKey) elements.geminiApiKey.focus();
        return;
    }

    // Append user message to UI
    appendChatMessageUI(query, "user");
    elements.chatInput.value = "";
    
    // Show AI loading bubble
    const loadingBubble = appendChatMessageUI(`
        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted);">
            <div class="loader-spinner"></div>
            <span>กำลังคิด...</span>
        </div>
    `, "ai", true);

    try {
        // Collect chat history from UI (up to last 10 messages)
        const messages = [];
        const messageElements = elements.chatMessagesContainer.querySelectorAll(".chat-message");
        
        // Let's build a nice single prompt with context of requirements
        const systemInstruction = `คุณคือผู้ช่วยวิเคราะห์ระบบ (AI System Analyst Assistant) สำหรับโครงการ ReqVibe หน้าที่ของคุณคือตอบคำถามและวิเคราะห์ข้อมูลความต้องการของระบบ (System Requirements/Survey Responses) ที่แนบมานี้อย่างถูกต้องและเป็นมืออาชีพ พยายามอ้างอิงข้อมูลจากรายการความต้องการจริงเสมอ หากไม่มีข้อมูลเพียงพอให้ระบุตามตรง และแนะนำแนวทางที่สมเหตุสมผลในการเก็บข้อมูลเพิ่ม`;
        
        const contextPrompt = `ข้อมูลความต้องการโครงการปัจจุบัน:
${serializeRequirementsForAI()}

คำถามของผู้ใช้:
${query}`;

        const result = await callGeminiAPI(contextPrompt, systemInstruction);
        
        // Remove loading bubble and append actual response
        loadingBubble.remove();
        appendChatMessageUI(result, "ai");
    } catch (e) {
        console.error("Chat Error:", e);
        loadingBubble.remove();
        appendChatMessageUI(`เกิดข้อผิดพลาด: ${e.message}`, "ai");
    }
}

function appendChatMessageUI(content, role, isRawHTML = false) {
    const msg = document.createElement("div");
    msg.className = `chat-message ${role}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderName = role === "user" ? "ผู้ใช้" : "ผู้ช่วยวิเคราะห์ระบบ (AI Analyst)";
    const icon = role === "user" ? "user" : "bot";
    
    const parsedContent = isRawHTML ? content : (role === "ai" ? parseMarkdownToHTML(content) : content);
    
    msg.innerHTML = `
        <div class="msg-meta">
            <i data-lucide="${icon}" style="width: 14px; height: 14px;"></i> ${senderName} • ${time}
        </div>
        <div>${parsedContent}</div>
    `;
    
    elements.chatMessagesContainer.appendChild(msg);
    lucide.createIcons();
    
    // Scroll to bottom
    elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
    
    return msg;
}

// ==========================================================================
// AI REQUIREMENT CARD CREATOR & PREVIEW LOGIC
// ==========================================================================
async function runAiCardCreator() {
    const inputVal = elements.aiCreatorInput.value.trim();
    if (!inputVal) {
        showToast("กรุณากรอกหัวข้อหรือฟังก์ชันที่ต้องการให้ AI สร้างการ์ด", "warning");
        return;
    }

    const apiKey = localStorage.getItem("reqvibe-gemini-key");
    if (!apiKey) {
        showToast("ไม่พบ Gemini API Key ในระบบ กำลังสกัดการ์ดในโหมดจำลอง (Mock Mode)", "info");
        const mockCard = generateMockAiCard(inputVal);
        state.lastAiProposedCard = mockCard;
        renderProposedCardPreview();
        return;
    }

    // Set loading state
    const originalBtnHTML = elements.btnAiCreateCard.innerHTML;
    elements.btnAiCreateCard.disabled = true;
    elements.btnAiCreateCard.innerHTML = `<span class="spinner-small"></span> กำลังประมวลผล...`;
    
    // Hide preview
    elements.aiCreatedCardPreview.classList.add("hidden");

    try {
        const systemInstruction = `You are an expert systems analyst and product owner. Analyze the user's requirement input and generate a highly detailed and structured software requirement. Output MUST be valid JSON conforming to the schema. Output in Thai.`;
        const prompt = `วิเคราะห์หัวข้อความต้องการ: "${inputVal}"
        แล้วจัดทำเป็นข้อมูลความต้องการซอฟต์แวร์ที่สมบูรณ์ โดยตอบกลับเป็น JSON วัตถุ (Object) ที่มีฟิลด์ดังนี้เท่านั้น:
        {
            "title": "หัวข้อความต้องการที่ขัดเกลาให้เป็นทางการและกระชับในภาษาไทย (ความยาวไม่เกิน 10 คำ)",
            "description": "คำอธิบายรายละเอียดฟังก์ชันการทำงานพร้อมระบุเงื่อนไขการยอมรับ (Acceptance Criteria) หรือขั้นตอนการทำงานสั้นๆ โดยละเอียดและเป็นระบบในภาษาไทย (ความยาว 2-4 บรรทัด)",
            "priority": "เลือกระดับความสำคัญที่เหมาะสมที่สุดจาก: 'High', 'Medium', 'Low'",
            "group": "แนะนำโมดูล/กลุ่มระบบที่เหมาะสมที่สุดในภาษาไทย โดยอาจจะเลือกจากกลุ่มที่มีอยู่: [${state.groups.join(', ')}] หรือแนะนำชื่อกลุ่มระบบใหม่ที่เหมาะสมที่สุดขึ้นมาก็ได้"
        }
        โปรดตอบกลับเป็นรูปแบบ JSON เปล่าเท่านั้น ไม่ต้องมีเครื่องหมายครอบลิงก์ใดๆ`;

        const aiData = await callGeminiAPIJson(prompt, systemInstruction);
        
        let maxNum = 0;
        state.requirements.forEach(r => {
            const num = parseInt(r.id.replace(/\D/g, "")) || 0;
            if (num > maxNum) maxNum = num;
        });
        const prefix = state.isSurveyForm ? "RESP-" : "REQ-";
        const newId = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;

        state.lastAiProposedCard = {
            id: newId,
            title: aiData.title || inputVal,
            description: aiData.description || "คำอธิบายไม่ได้ถูกระบุไว้โดย AI",
            priority: aiData.priority || "Medium",
            status: "To Do",
            group: aiData.group || "Unassigned"
        };
        
        renderProposedCardPreview();
        showToast("สกัดการ์ดความต้องการด้วย AI สำเร็จ! ตรวจสอบตัวอย่างและกดบันทึก", "success");
    } catch (err) {
        console.error("AI Card Creator Error:", err);
        showToast(`เกิดข้อผิดพลาดในการเรียก AI: ${err.message}. ลองใช้อีกครั้งหรือตรวจสอบสิทธิ์ API Key`, "danger");
        
        // Failover to Mock so user is not stuck
        const mockCard = generateMockAiCard(inputVal);
        state.lastAiProposedCard = mockCard;
        renderProposedCardPreview();
    } finally {
        elements.btnAiCreateCard.disabled = false;
        elements.btnAiCreateCard.innerHTML = originalBtnHTML;
    }
}

function generateMockAiCard(inputVal) {
    let maxNum = 0;
    state.requirements.forEach(r => {
        const num = parseInt(r.id.replace(/\D/g, "")) || 0;
        if (num > maxNum) maxNum = num;
    });
    const prefix = state.isSurveyForm ? "RESP-" : "REQ-";
    const newId = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
    
    // Auto-detect group from simple keywords
    let group = "ฟีเจอร์หลัก";
    const lowerInput = inputVal.toLowerCase();
    if (lowerInput.includes("login") || lowerInput.includes("ล็อกอิน") || lowerInput.includes("รหัสผ่าน") || lowerInput.includes("สิทธิ์")) {
        group = "การจัดการผู้ใช้งาน";
    } else if (lowerInput.includes("ความปลอดภัย") || lowerInput.includes("otp") || lowerInput.includes("authen") || lowerInput.includes("secure")) {
        group = "ความปลอดภัย";
    } else if (lowerInput.includes("จ่าย") || lowerInput.includes("pay") || lowerInput.includes("เงิน") || lowerInput.includes("โอน")) {
        group = "ระบบการชำระเงิน";
    } else if (lowerInput.includes("วิเคราะห์") || lowerInput.includes("รายงาน") || lowerInput.includes("กราฟ") || lowerInput.includes("chart")) {
        group = "ระบบวิเคราะห์ข้อมูล";
    }
    
    return {
        id: newId,
        title: inputVal,
        description: `คำอธิบายสกัดสำเร็จสำหรับ: "${inputVal}" โดยระบบทำการสร้างแบบจำลอง UX ของระบบ หน้าอินเตอร์เฟซผู้ใช้งาน กฎเกณฑ์ทางธุรกิจ และขอบข่าย API เบื้องต้น เพื่อนำไปปรับปรุงโครงสร้างของส่วนงานต่อไป`,
        priority: "Medium",
        status: "To Do",
        group: group
    };
}

function renderProposedCardPreview() {
    if (!state.lastAiProposedCard) {
        elements.aiCreatedCardPreview.classList.add("hidden");
        elements.aiCreatedCardPreview.innerHTML = "";
        return;
    }
    
    const card = state.lastAiProposedCard;
    const isNewGroup = card.group !== "Unassigned" && !state.groups.includes(card.group);
    
    const priorityClass = card.priority.toLowerCase();
    const statusClass = card.status.toLowerCase().replace(/\s+/g, '-');
    
    const priorityText = card.priority === 'High' ? 'สูง' : (card.priority === 'Low' ? 'ต่ำ' : 'ปานกลาง');
    const statusText = card.status === 'Done' ? 'เสร็จสิ้น' : (card.status === 'In Progress' ? 'กำลังทำ' : 'ยังไม่ได้เริ่ม');
    const groupText = (card.group && card.group !== 'Unassigned') ? card.group : 'ยังไม่ได้จัดกลุ่ม';
    
    elements.aiCreatedCardPreview.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.75rem; color: var(--color-indigo); font-weight: bold; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i> แนะนำโดย AI (Preview)
            </span>
            <span style="font-family: monospace; font-weight: bold; color: var(--text-muted); font-size: 0.8rem;">${card.id}</span>
        </div>
        <h4 style="margin: 0 0 8px 0; font-size: 0.95rem; color: var(--text-main); font-weight: 600;">${card.title}</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
            <span class="badge-priority ${priorityClass}" style="font-size: 0.7rem; padding: 2px 6px;">${priorityText}</span>
            <span class="badge-status ${statusClass}" style="font-size: 0.7rem; padding: 2px 6px;">${statusText}</span>
            <span class="badge-group" style="font-size: 0.7rem; padding: 2px 6px;">${groupText} ${isNewGroup ? '<span style="color: var(--color-cyan); font-size: 0.6rem; margin-left: 2px;">(ใหม่)</span>' : ''}</span>
        </div>
        <p style="margin: 0 0 12px 0; font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; max-height: 100px; overflow-y: auto;">
            ${card.description}
        </p>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="btn-ai-preview-cancel" class="btn btn-secondary btn-small" style="font-size: 0.75rem; height: 28px; padding: 0 10px;">
                ยกเลิก
            </button>
            <button id="btn-ai-preview-save" class="btn btn-primary btn-small" style="font-size: 0.75rem; height: 28px; padding: 0 10px;">
                <i data-lucide="plus"></i> บันทึกเข้าระบบ
            </button>
        </div>
    `;
    
    elements.aiCreatedCardPreview.classList.remove("hidden");
    lucide.createIcons();
    
    // Bind actions
    document.getElementById("btn-ai-preview-cancel").addEventListener("click", () => {
        state.lastAiProposedCard = null;
        renderProposedCardPreview();
    });
    
    document.getElementById("btn-ai-preview-save").addEventListener("click", () => {
        const savedCard = state.lastAiProposedCard;
        if (savedCard) {
            // Re-validate ID uniqueness in case another card was added
            if (state.requirements.some(r => r.id === savedCard.id)) {
                let maxNum = 0;
                state.requirements.forEach(r => {
                    const num = parseInt(r.id.replace(/\D/g, "")) || 0;
                    if (num > maxNum) maxNum = num;
                });
                const prefix = state.isSurveyForm ? "RESP-" : "REQ-";
                savedCard.id = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
            }
            
            // Add custom group to list if new
            if (savedCard.group !== "Unassigned" && !state.groups.includes(savedCard.group)) {
                state.groups.push(savedCard.group);
            }
            
            state.requirements.push(savedCard);
            saveToLocalStorage();
            showToast(`เพิ่มการ์ดความต้องการ ${savedCard.id} สำเร็จ!`, "success");
            
            state.lastAiProposedCard = null;
            renderProposedCardPreview();
            
            // Clear inputs
            elements.aiCreatorInput.value = "";
            
            // Refresh views
            updateUI();
        }
    });
}


