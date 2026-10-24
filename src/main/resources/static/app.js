const API = "api";
let batches = [];
let currentBatch = null;
let currentFilter = "ALL";
let selectedFiles = [];
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 100 * 1024 * 1024;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(element.timer);
  element.timer = setTimeout(() => element.classList.remove("show"), 2400);
}

async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(`${API}/${url}`, options);
  } catch {
    throw new Error("无法连接检测服务，请稍后重试");
  }
  if (!response.ok) {
    let message = "操作失败";
    try { message = (await response.json()).message || message; } catch {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

function showView(id) {
  $$(".view").forEach(view => view.classList.toggle("active", view.id === id));
  $$(".nav-item[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadBatches() {
  batches = await request("batches");
  renderDashboard();
}

function renderDashboard() {
  const images = batches.flatMap(batch => batch.images || []);
  const ok = images.filter(image => image.result.status === "OK").length;
  const values = [batches.length, images.length, ok, images.length - ok];
  $$("#globalStats strong").forEach((node, index) => node.textContent = values[index]);

  const list = $("#batchList");
  if (!batches.length) {
    list.innerHTML = `<div class="empty"><div><strong>还没有检测批次</strong><small>创建第一个批次，上传图片跑通检测链路。</small></div></div>`;
    return;
  }
  list.innerHTML = batches.map(batch => {
    const batchImages = batch.images || [];
    const ng = batchImages.filter(image => image.result.status === "NG").length;
    return `<article class="batch-row">
      <div class="batch-main"><strong>${escapeHtml(batch.name)}</strong><small>${new Date(batch.createdAt).toLocaleString("zh-CN")}</small></div>
      <div class="batch-cell"><strong>${escapeHtml(batch.partNumber || "未填写")}</strong><span>工件编号</span></div>
      <div class="batch-cell"><strong>${batchImages.length}</strong><span>图片</span></div>
      <div class="batch-cell"><strong class="${ng ? "ng" : "ok"}">${ng}</strong><span>NG</span></div>
      <button class="batch-open" data-id="${batch.id}">查看</button>
    </article>`;
  }).join("");
  $$(".batch-open").forEach(button => button.onclick = () => openBatch(button.dataset.id));
}

async function openBatch(id) {
  currentBatch = await request(`batches/${id}`);
  $("#detailId").textContent = `BATCH / ${currentBatch.id}`;
  $("#detailName").textContent = currentBatch.name;
  $("#detailMeta").textContent = `${currentBatch.partNumber || "未填写工件编号"} · ${currentBatch.note || "暂无备注"}`;
  $("#exportLink").href = `${API}/batches/${id}/export`;
  selectedFiles = [];
  $("#fileInput").value = "";
  updateDropZone();
  renderBatch();
  showView("batch-detail");
}

function renderBatch() {
  const images = currentBatch.images || [];
  const ok = images.filter(image => image.result.status === "OK").length;
  const ng = images.length - ok;
  const rate = images.length ? Math.round(ok / images.length * 100) : 0;
  $("#batchStats").innerHTML = `<div class="summary-title"><span>02</span><h2>本批统计</h2></div>
    <div class="donut" style="--rate:${rate}"><div><strong>${rate}%</strong><small>合格率</small></div></div>
    <div class="summary-values"><div><span>总数</span><strong>${images.length}</strong></div><div><span>OK</span><strong class="ok">${ok}</strong></div><div><span>NG</span><strong class="ng">${ng}</strong></div></div>`;

  const visible = images.filter(image => currentFilter === "ALL" || image.result.status === currentFilter);
  const grid = $("#imageGrid");
  if (!visible.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div><strong>暂无检测图片</strong><small>选择图片并上传，Mock引擎会立即返回结果。</small></div></div>`;
    return;
  }
  grid.innerHTML = visible.map(image => {
    const result = image.result;
    const box = result.status === "NG" ? `<div class="box" style="left:${result.x}%;top:${result.y}%;width:${result.width}%;height:${result.height}%"><span class="box-label">${result.category} ${(result.confidence * 100).toFixed(0)}%</span></div>` : "";
    return `<article class="image-card" data-image-id="${image.id}">
      <div class="image-preview"><img src="${API}/files/${encodeURIComponent(image.storedName)}" alt="${escapeHtml(image.originalName)}"><span class="result-badge ${result.status}">${result.status}</span>${box}</div>
      <div class="image-info"><div><strong>${escapeHtml(image.originalName)}</strong><small>${result.category} · ${result.inferenceMs}ms</small></div>${result.reviewed ? '<span class="reviewed">✓ 已复核</span>' : ""}</div>
    </article>`;
  }).join("");
  $$(".image-card").forEach(card => card.onclick = () => openReview(card.dataset.imageId));
}

function openReview(imageId) {
  const image = currentBatch.images.find(item => item.id === imageId);
  const form = $("#reviewForm");
  form.elements.imageId.value = imageId;
  form.elements.status.value = image.result.status;
  form.elements.category.value = image.result.category;
  form.elements.note.value = image.result.reviewNote || "";
  $("#reviewDialog").showModal();
}

function updateDropZone() {
  const zone = $("#dropZone");
  zone.querySelector("strong").textContent = selectedFiles.length ? `已选择 ${selectedFiles.length} 张图片` : "点击选择或拖放图片";
  $("#uploadButton").disabled = !selectedFiles.length;
}

function selectFiles(fileList) {
  const files = [...fileList];
  const invalidType = files.find(file => !ALLOWED_TYPES.has(file.type));
  const oversize = files.find(file => file.size > MAX_FILE_BYTES);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (invalidType) {
    selectedFiles = [];
    toast(`不支持 ${invalidType.name}，请选择 JPG、PNG 或 WEBP`);
  } else if (oversize) {
    selectedFiles = [];
    toast(`${oversize.name} 超过单张 10MB 限制`);
  } else if (totalSize > MAX_REQUEST_BYTES) {
    selectedFiles = [];
    toast("所选图片总大小超过 100MB");
  } else {
    selectedFiles = files;
  }
  updateDropZone();
}

$("#batchForm").onsubmit = async event => {
  event.preventDefault();
  const submitButton = event.submitter;
  if (submitButton) submitButton.disabled = true;
  const data = Object.fromEntries(new FormData(event.target));
  try {
    const batch = await request("batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    event.target.reset();
    await loadBatches();
    await openBatch(batch.id);
    toast("批次创建成功");
  } catch (error) { toast(error.message); }
  finally { if (submitButton) submitButton.disabled = false; }
};

$("#fileInput").onchange = event => selectFiles(event.target.files);
$("#dropZone").ondragover = event => { event.preventDefault(); event.currentTarget.classList.add("dragging"); };
$("#dropZone").ondragleave = event => event.currentTarget.classList.remove("dragging");
$("#dropZone").ondrop = event => {
  event.preventDefault();
  event.currentTarget.classList.remove("dragging");
  selectFiles(event.dataTransfer.files);
};

$("#uploadButton").onclick = async () => {
  const form = new FormData();
  selectedFiles.forEach(file => form.append("files", file));
  $("#uploadButton").disabled = true;
  $("#uploadButton").textContent = "正在检测…";
  try {
    const uploadedCount = selectedFiles.length;
    await request(`batches/${currentBatch.id}/images`, { method: "POST", body: form });
    toast(`完成 ${uploadedCount} 张图片检测`);
    selectedFiles = [];
    $("#fileInput").value = "";
    await loadBatches();
    await openBatch(currentBatch.id);
  } catch (error) { toast(error.message); }
  finally {
    $("#uploadButton").textContent = "上传并开始检测";
    updateDropZone();
  }
};

$("#reviewForm").onsubmit = async event => {
  event.preventDefault();
  const form = $("#reviewForm");
  const data = Object.fromEntries(new FormData(form));
  try {
    await request(`batches/${currentBatch.id}/images/${data.imageId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    $("#reviewDialog").close();
    await loadBatches();
    await openBatch(currentBatch.id);
    toast("复核结果已保存");
  } catch (error) { toast(error.message); }
};

$("#closeReview").onclick = () => $("#reviewDialog").close();
$("#cancelReview").onclick = () => $("#reviewDialog").close();
$("#reviewForm").elements.status.onchange = event => {
  if (event.target.value === "OK") $("#reviewForm").elements.category.value = "无缺陷";
};
$("#reviewForm").elements.category.onchange = event => {
  $("#reviewForm").elements.status.value = event.target.value === "无缺陷" ? "OK" : "NG";
};

$$(`[data-view]`).forEach(item => item.onclick = () => showView(item.dataset.view));
$$(`[data-view-target]`).forEach(item => item.onclick = () => showView(item.dataset.viewTarget));
$("#quickCreate").onclick = () => showView("new-batch");
$("#refreshButton").onclick = () => loadBatches().then(() => toast("数据已刷新"));
$$(`[data-filter]`).forEach(button => button.onclick = () => {
  currentFilter = button.dataset.filter;
  $$(`[data-filter]`).forEach(item => item.classList.toggle("active", item === button));
  renderBatch();
});

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
$("#environmentBadge").textContent = isLocal ? "LOCAL / CPU" : "ALIYUN / CPU";
request("health").then(() => {
  $("#apiStatus").textContent = "API 已连接";
  $("#serviceState").textContent = "检测服务运行中";
  $("#servicePulse").classList.remove("offline");
}).catch(() => {
  $("#apiStatus").textContent = "API 离线";
  $("#serviceState").textContent = "检测服务不可用";
  $("#servicePulse").classList.add("offline");
});
loadBatches().catch(error => toast(error.message));
