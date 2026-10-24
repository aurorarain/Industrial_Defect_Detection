const DELIVERY = [
  { day: "首日 · 阶段 01", title: "方案收敛", output: "从创业规划变成可运行产品", tasks: [["确定最小闭环", "只保留批次、上传、检测、复核、统计与导出。"], ["确定轻量架构", "采用 Java 17 + Spring Boot 单体，适配 4G CPU 服务器。"]] },
  { day: "首日 · 阶段 02", title: "Demo 主链路", output: "核心业务可以完整操作", tasks: [["完成批次与上传", "实现批次创建、列表、详情及多图上传。"], ["完成 Mock 检测", "返回 OK/NG、类别、置信度、检测框和耗时。"], ["完成人工复核", "允许修改最终判定、缺陷类别与备注。"], ["完成统计与 CSV", "页面统计与逐图导出形成交付闭环。"]] },
  { day: "首日 · 阶段 03", title: "工程化与验证", output: "不是只能演示一次的页面", tasks: [["加入 JSON 持久化", "服务重启后仍能读取批次与结果。"], ["加入自动化测试", "覆盖健康检查、建批次、上传、Mock 检测和统计。"], ["修复 IDEA 构建", "统一 Maven 3.9.11 与 Java 17。"]] },
  { day: "首日 · 阶段 04", title: "仓库与服务器", output: "公网可访问、代码可追踪", tasks: [["建立私有 GitHub 仓库", "代码、部署配置与开发文档统一进入 main。"], ["备份并清理旧服务器", "旧站与数据库完整备份后移除无关应用。"], ["部署公网 Demo", "配置 Nginx、systemd，并验证公网入口。"], ["准备自动部署", "加入 GitHub Actions，等待仓库 Secrets 启用。"]] },
  { day: "当日收尾", title: "体验修复", output: "从能跑提升到可稳定演示", tasks: [["重做 Demo 视觉", "改善信息层级、移动端导航、图片展示和状态反馈。"], ["修复上传与复核 Bug", "补齐文件校验、失败恢复、重复选择和弹窗行为。"], ["重写开发日志", "用首日真实交付替代虚构的七天排期。"], ["打通场景选择与文档导航", "检测场景写入批次；文档滚动不再产生 Hash 历史。"]] }
];

const total = DELIVERY.reduce((sum, group) => sum + group.tasks.length, 0);
const done = total;
const percent = Math.round(done / total * 100);

document.getElementById("taskBoard").innerHTML = DELIVERY.map((group, index) => `
  <article class="day-card">
    <div class="day-head"><div><span>${group.day}</span><h3>${group.title}</h3></div><small>阶段产出<br>${group.output}</small></div>
    <div class="task-list">${group.tasks.map(task => {
      return `<div class="task-item done"><input type="checkbox" checked disabled><span><strong>${task[0]}</strong><small>${task[1]}</small></span></div>`;
    }).join("")}</div>
  </article>`).join("");

document.getElementById("progressBar").style.width = `${percent}%`;
document.getElementById("progressText").textContent = `${percent}%`;
document.getElementById("metricProgress").textContent = `${percent}%`;
document.getElementById("doneCount").textContent = `已验证 ${done} 项`;
document.getElementById("remainingCount").textContent = "首日交付已完成";
document.getElementById("metricCount").textContent = `${done} / ${total}`;
document.getElementById("stageStatus").textContent = "首日 MVP 已上线";

const choiceLabels = { metal: "已选择：机加工金属件。", semiconductor: "已选择：半导体设备零部件。", public: "已选择：公开数据技术 Demo。" };
const choiceKey = "industrial_defect_scene_v2";
const buttons = [...document.querySelectorAll("[data-choice]")];
function renderChoice() { const choice = localStorage.getItem(choiceKey); buttons.forEach(button => button.classList.toggle("selected", button.dataset.choice === choice)); document.getElementById("savedChoice").textContent = choice ? `${choiceLabels[choice]} 后续模型与样本将按这一场景收敛。` : "尚未选择真实数据场景；当前 Mock 结果只用于验证业务流程。"; }
buttons.forEach(button => button.onclick = () => { localStorage.setItem(choiceKey, button.dataset.choice); renderChoice(); });
renderChoice();

if (window.location.hash) history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
const links = [...document.querySelectorAll("#nav [data-scroll-target]")];
const scrollButtons = [...document.querySelectorAll("[data-scroll-target]")];
const sidebar = document.querySelector(".sidebar");
document.getElementById("menuButton").onclick = () => sidebar.classList.toggle("open");
scrollButtons.forEach(button => button.onclick = () => {
  document.getElementById(button.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
  sidebar.classList.remove("open");
});
const observer = new IntersectionObserver(entries => { const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0]; if(visible) links.forEach(link => link.classList.toggle("active", link.dataset.scrollTarget === visible.target.id)); }, { rootMargin:"-25% 0px -60%", threshold:[0,.2,.5] });
links.map(link => document.getElementById(link.dataset.scrollTarget)).filter(Boolean).forEach(section => observer.observe(section));

document.getElementById("exportButton").onclick = () => { const blob = new Blob([JSON.stringify({ version:"0.1.1", date:"2026-10-24", delivered:DELIVERY }, null, 2)], {type:"application/json"}); const link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.download="首日开发交付记录.json"; link.click(); URL.revokeObjectURL(link.href); };
document.getElementById("resetButton").hidden = true;
