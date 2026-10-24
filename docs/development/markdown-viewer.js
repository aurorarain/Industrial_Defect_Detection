const escapeHtml = value => value.replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const inline = value => escapeHtml(value)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>');
const slug = value => value.replace(/[\s`.:：/\\]+/g, "-").replace(/[^\w\u4e00-\u9fa5-]/g, "").toLowerCase();

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const output = [];
  const headings = [];
  let inCode = false;
  let code = [];
  let listType = "";
  const closeList = () => { if (listType) { output.push(`</${listType}>`); listType = ""; } };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith("```")) {
      closeList();
      if (inCode) { output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`); code = []; }
      inCode = !inCode;
      continue;
    }
    if (inCode) { code.push(line); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const id = slug(heading[2]);
      output.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);
      if (level > 1) headings.push({ level, id, title: heading[2] });
      continue;
    }
    if (/^\|.+\|$/.test(line) && /^\|?\s*:?-+/.test(lines[index + 1] || "")) {
      closeList();
      const rows = [line, ...lines.slice(index + 2).filter(row => /^\|.+\|$/.test(row))];
      index += rows.length;
      const cells = row => row.slice(1, -1).split("|").map(cell => cell.trim());
      output.push(`<table><thead><tr>${cells(rows[0]).map(cell => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(row => `<tr>${cells(row).map(cell => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const nextType = unordered ? "ul" : "ol";
      if (listType !== nextType) { closeList(); listType = nextType; output.push(`<${listType}>`); }
      output.push(`<li>${inline((unordered || ordered)[1])}</li>`);
      continue;
    }
    closeList();
    if (!line.trim()) continue;
    if (line.startsWith("> ")) output.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    else output.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return { html: output.join("\n"), headings };
}

fetch("开发文档.md")
  .then(response => { if (!response.ok) throw new Error("开发文档加载失败"); return response.text(); })
  .then(markdown => {
    const rendered = renderMarkdown(markdown);
    document.getElementById("document").innerHTML = rendered.html;
    document.getElementById("toc").innerHTML = rendered.headings.map(item => `<a href="#${item.id}">${item.title}</a>`).join("");
  })
  .catch(error => document.getElementById("document").innerHTML = `<div class="loading">${escapeHtml(error.message)}</div>`);
