/**
 * ReqVibe - Application Logic File
 * Handles: state management, spreadsheet parsing, NLP heuristics, drag-and-drop, charts, CRUD operations, exports.
 */

// Application State
let state = {
    requirements: [],
    groups: ["ความปลอดภัย", "ระบบการชำระเงิน", "ฟีเจอร์หลัก", "การจัดการผู้ใช้งาน", "ระบบวิเคราะห์ข้อมูล"], // Default groups
    activeTab: "analytics",
    theme: "dark",
    sorting: { column: "id", direction: "asc" },
    filters: { search: "", group: "", priority: "", status: "", fnSearch: "" },
    sourceName: "ไม่ได้เชื่อมต่อแหล่งข้อมูล",
    aiInsights: null,
    isSurveyForm: false
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

    // Toast
    toastContainer: document.getElementById("toast-container")
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    initTheme();
    loadFromLocalStorage();
    setupEventListeners();
    updateUI();
});

// Theme Setup (Persist in localStorage)
function initTheme() {
    const savedTheme = localStorage.getItem("reqvibe-theme") || "dark";
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
        });
    });

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
function runAIRequirementClustering() {
    if (state.requirements.length === 0) {
        showToast("กรุณานำเข้าข้อมูลความต้องการหรือผลสำรวจก่อน", "warning");
        return;
    }

    elements.btnRunAnalysis.disabled = true;
    elements.btnRunAnalysis.innerHTML = `
        <div class="loader-spinner"></div>
        <span>กำลังวิเคราะห์ข้อมูล...</span>
    `;

    showToast("กำลังประมวลผลคำศัพท์และวิเคราะห์ข้อมูล...", "info");

    // Local clustering algorithms simulation (Heuristic Matching)
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
        showToast("ประมวลผลวิเคราะห์การจัดกลุ่มเรียบร้อยแล้ว!", "success");
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

    // Double click to edit card
    card.addEventListener("dblclick", () => {
        const masterIdx = state.requirements.findIndex(r => r.id === req.id);
        openRequirementModal(masterIdx);
    });

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
