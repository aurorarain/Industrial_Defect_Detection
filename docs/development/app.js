const STORAGE_KEY = "industrial_defect_phase1_v1";
const IMPLEMENTED_TASKS = ["0-0", "0-1", "0-2", "1-0", "1-1", "1-2", "2-0", "2-1", "2-2", "3-0", "3-1", "4-0", "4-1", "4-2", "5-0", "6-1"];

const DAYS = [
  {
    day: "DAY 01",
    title: "工程起步",
    output: "前后端都能启动",
    tasks: [
      ["建立项目目录", "创建 Spring Boot、静态页面、文档和测试目录。"],
      ["启动 Spring Boot", "提供 /health 接口并返回版本信息。"],
      ["建立 Demo 页面", "建立仪表盘、批次创建与检测详情视图。"]
    ]
  },
  {
    day: "DAY 02",
    title: "批次与上传",
    output: "图片可以保存",
    tasks: [
      ["建立 JSON 持久化", "先以零外部依赖方式保存批次和检测结果。"],
      ["完成批次接口", "新建、列表、查看一个批次。"],
      ["完成图片上传", "原图独立保存，记录尺寸与文件哈希。"]
    ]
  },
  {
    day: "DAY 03",
    title: "模拟检测",
    output: "有框和类别结果",
    tasks: [
      ["定义统一检测结果", "包含类别、坐标、置信度、耗时和模型版本。"],
      ["实现 Mock 推理", "用固定规则返回可演示结果，不阻塞前端。"],
      ["完成结果页面", "原图叠加缺陷框，并显示OK或NG。"]
    ]
  },
  {
    day: "DAY 04",
    title: "人工复核",
    output: "结果可以纠正",
    tasks: [
      ["实现复核操作", "确认结果、修改类别、删除误框。"],
      ["保留修改记录", "记录修改前后值和操作时间。"]
    ]
  },
  {
    day: "DAY 05",
    title: "统计与导出",
    output: "能交付一份结果",
    tasks: [
      ["完成批次统计", "展示图片数、OK、NG和类别分布。"],
      ["导出 CSV", "逐图输出结论、类别、置信度和复核状态。"],
      ["核对统计一致性", "页面数字与CSV逐项一致。"]
    ]
  },
  {
    day: "DAY 06",
    title: "接入真实推理",
    output: "Mock 可替换",
    tasks: [
      ["建立推理适配边界", "Mock 与后续 ONNX 保持统一结果结构。"],
      ["接入固定模型", "没有可用模型时保留Mock，不在此处卡住。"]
    ]
  },
  {
    day: "DAY 07",
    title: "验收与打包",
    output: "可稳定演示",
    tasks: [
      ["建立回归样本", "固定10到20张图覆盖正常、缺陷和坏文件。"],
      ["完成一键启动", "提供 start.bat、README 和环境说明。"],
      ["连续演示30分钟", "记录问题，只修阻断性错误。"]
    ]
  }
];

const choiceLabels = {
  metal: "已选择：机加工金属件。后续默认围绕划痕、磕碰、缺料、污渍和毛刺。",
  semiconductor: "已选择：半导体设备零部件。仍限定肉眼可见外观缺陷。",
  public: "已选择：公开数据技术Demo。只证明系统链路，不宣传客户场景效果。"
};

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved || { tasks: Object.fromEntries(IMPLEMENTED_TASKS.map(key => [key, true])), choice: null };
  } catch {
    return { tasks: Object.fromEntries(IMPLEMENTED_TASKS.map(key => [key, true])), choice: null };
  }
}

let state = readState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderTasks() {
  const board = document.getElementById("taskBoard");
  board.innerHTML = DAYS.map((group, dayIndex) => `
    <article class="day-card">
      <div class="day-head">
        <div><span>${group.day}</span><h3>${group.title}</h3></div>
        <small>当日产出<br>${group.output}</small>
      </div>
      <div class="task-list">
        ${group.tasks.map((task, taskIndex) => {
          const key = `${dayIndex}-${taskIndex}`;
          const done = Boolean(state.tasks[key]);
          return `<label class="task-item ${done ? "done" : ""}">
            <input type="checkbox" data-key="${key}" ${done ? "checked" : ""}>
            <span><strong>${task[0]}</strong><small>${task[1]}</small></span>
          </label>`;
        }).join("")}
      </div>
    </article>
  `).join("");

  board.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", event => {
      state.tasks[event.target.dataset.key] = event.target.checked;
      saveState();
      renderTasks();
      updateProgress();
    });
  });
}

function updateProgress() {
  const total = DAYS.reduce((sum, group) => sum + group.tasks.length, 0);
  const done = Object.entries(state.tasks).filter(([, value]) => value).length;
  const percent = Math.round((done / total) * 100);
  document.getElementById("progressBar").style.width = `${percent}%`;
  document.getElementById("progressText").textContent = `${percent}%`;
  document.getElementById("metricProgress").textContent = `${percent}%`;
  document.getElementById("doneCount").textContent = `已完成 ${done} 项`;
  document.getElementById("remainingCount").textContent = `剩余 ${total - done} 项`;
  document.getElementById("metricCount").textContent = `${done} / ${total}`;

  const status = percent === 100 ? "第一阶段已验收" : percent >= 70 ? "主链路已跑通" : percent >= 30 ? "主链路开发中" : "从环境开始";
  document.getElementById("stageStatus").textContent = status;
}

function renderChoice() {
  const buttons = document.querySelectorAll("[data-choice]");
  buttons.forEach(button => {
    button.classList.toggle("selected", button.dataset.choice === state.choice);
    button.onclick = () => {
      state.choice = button.dataset.choice;
      saveState();
      renderChoice();
    };
  });
  document.getElementById("savedChoice").textContent = state.choice ? choiceLabels[state.choice] : "尚未选择。你也可以直接在聊天里告诉Mia更具体的工件和缺陷。";
}

function setupNavigation() {
  const links = [...document.querySelectorAll("#nav a")];
  const sections = links.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`));
  }, { rootMargin: "-25% 0px -60%", threshold: [0, .2, .5] });
  sections.forEach(section => observer.observe(section));

  const sidebar = document.querySelector(".sidebar");
  document.getElementById("menuButton").onclick = () => sidebar.classList.toggle("open");
  links.forEach(link => link.addEventListener("click", () => sidebar.classList.remove("open")));
}

function exportProgress() {
  const completed = [];
  DAYS.forEach((group, dayIndex) => group.tasks.forEach((task, taskIndex) => {
    if (state.tasks[`${dayIndex}-${taskIndex}`]) completed.push(`${group.day} - ${task[0]}`);
  }));
  const payload = {
    exportedAt: new Date().toISOString(),
    choice: state.choice,
    completed,
    raw: state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "第一阶段开发进度.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

document.getElementById("exportButton").onclick = exportProgress;
document.getElementById("resetButton").onclick = () => {
  if (!confirm("确定清空所有任务进度和讨论选择吗？")) return;
  state = { tasks: Object.fromEntries(IMPLEMENTED_TASKS.map(key => [key, true])), choice: null };
  saveState();
  renderTasks();
  updateProgress();
  renderChoice();
};

renderTasks();
updateProgress();
renderChoice();
setupNavigation();
