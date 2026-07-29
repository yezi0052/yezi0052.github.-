"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Eye, Github, ImagePlus, KeyRound, Loader2, Save, ShieldAlert, Upload } from "lucide-react";
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from "../siteContent";

const REPO_OWNER = "yezi0052";
const REPO_NAME = "yezi0052.github.-";
const BRANCH = "main";
const CONTENT_PATH = "public/site-content.json";
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONTENT_PATH}`;
const UPLOAD_DIR = "public/uploads";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const IMAGE_TARGETS = [
  { value: "hero.backgroundImage", label: "首页首屏大图" },
  { value: "services.cards.0.image", label: "产品系列 1 · 电视背景墙" },
  { value: "services.cards.1.image", label: "产品系列 2 · 玄关收纳墙" },
  { value: "services.cards.2.image", label: "产品系列 3 · 卧室护墙板" },
  { value: "services.cards.3.image", label: "产品系列 4 · 全屋木饰面" },
  { value: "cases.featured.image", label: "实景案例 · 主案例" },
  { value: "cases.sideCards.0.image", label: "实景案例 · 侧边案例 1" },
  { value: "cases.sideCards.1.image", label: "实景案例 · 侧边案例 2" },
  { value: "materials.image", label: "板材与工艺主图" },
  { value: "estimate.backgroundImage", label: "预算估算背景图" },
  { value: "contact.image", label: "展厅照片" }
];

const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function decodeBase64Json(content) {
  const binary = atob(content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function encodeBase64Json(value) {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function encodeFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("照片读取失败"));
    reader.readAsDataURL(file);
  });
}

function getByPath(target, path) {
  return path.split(".").reduce((cursor, key) => cursor?.[key], target);
}

function setByPath(target, path, value) {
  const keys = path.split(".");
  let cursor = target;

  keys.slice(0, -1).forEach((key) => {
    if (!cursor[key]) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  });

  cursor[keys.at(-1)] = value;
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function Field({ label, value, onChange, multiline = false, hint, className = "" }) {
  return (
    <label className={`admin-field ${className}`}>
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function SectionHeader({ title }) {
  return <h2>{title}</h2>;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [sha, setSha] = useState("");
  const [content, setContent] = useState(DEFAULT_SITE_CONTENT);
  const [status, setStatus] = useState("先填写 GitHub Token，再点击读取线上内容。");
  const [isBusy, setIsBusy] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [uploadTarget, setUploadTarget] = useState(IMAGE_TARGETS[0].value);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch("/site-content.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : DEFAULT_SITE_CONTENT))
      .then((payload) => setContent(mergeSiteContent(payload)))
      .catch(() => setContent(DEFAULT_SITE_CONTENT));
  }, []);

  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  const canSave = useMemo(() => token.trim().length > 0 && Boolean(sha) && !isBusy, [token, sha, isBusy]);
  const canUpload = useMemo(
    () => token.trim().length > 0 && Boolean(uploadFile) && !isBusy,
    [token, uploadFile, isBusy]
  );

  const requestHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token.trim()}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };

  const loadFromGithub = async () => {
    if (!token.trim()) {
      setStatus("请先填写 GitHub Token。");
      return;
    }

    setIsBusy(true);
    setStatus("正在读取 GitHub 上的内容...");

    try {
      const response = await fetch(`${API_URL}?ref=${BRANCH}`, {
        headers: requestHeaders
      });

      if (!response.ok) {
        throw new Error(`读取失败：${response.status}`);
      }

      const data = await response.json();
      const payload = decodeBase64Json(data.content);
      setContent(mergeSiteContent(payload));
      setSha(data.sha);
      setStatus("已读取线上内容，可以开始编辑。");
    } catch (error) {
      setStatus(`${error.message}。请检查 Token 是否有该仓库 Contents 读写权限。`);
    } finally {
      setIsBusy(false);
    }
  };

  const saveToGithub = async () => {
    if (!canSave) {
      setStatus("请先读取线上内容，再保存。");
      return;
    }

    setIsBusy(true);
    setStatus("正在保存到 GitHub，并触发自动部署...");

    try {
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: {
          ...requestHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          branch: BRANCH,
          message: "Update site content from admin",
          content: encodeBase64Json(content),
          sha
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `保存失败：${response.status}`);
      }

      const data = await response.json();
      setSha(data.content.sha);
      setLastSavedAt(new Date().toLocaleString("zh-CN"));
      setStatus("保存成功。GitHub Pages 正在自动部署，通常 1 分钟左右生效。");
    } catch (error) {
      setStatus(`${error.message}。如果多人同时修改，请重新读取后再保存。`);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!IMAGE_EXTENSIONS[file.type]) {
      event.target.value = "";
      setUploadFile(null);
      setUploadPreview("");
      setStatus("请选择 JPG、PNG 或 WebP 格式的照片。");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      event.target.value = "";
      setUploadFile(null);
      setUploadPreview("");
      setStatus("照片不能超过 8MB，请压缩后重新选择。");
      return;
    }

    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setStatus(`已选择 ${file.name}，确认位置后点击上传照片。`);
  };

  const uploadPhoto = async () => {
    if (!token.trim()) {
      setStatus("请先填写 GitHub Token。");
      return;
    }

    if (!uploadFile) {
      setStatus("请先选择一张墙板照片。");
      return;
    }

    setIsBusy(true);
    setStatus("正在上传照片到 GitHub...");

    try {
      const extension = IMAGE_EXTENSIONS[uploadFile.type];
      const uniqueId = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : String(Date.now());
      const fileName = `wallboard-${Date.now()}-${uniqueId}.${extension}`;
      const uploadPath = `${UPLOAD_DIR}/${fileName}`;
      const uploadUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${uploadPath}`;
      const encodedFile = await encodeFileBase64(uploadFile);
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          ...requestHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          branch: BRANCH,
          message: `Upload wallboard photo: ${fileName}`,
          content: encodedFile
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `上传失败：${response.status}`);
      }

      const publicUrl = `/uploads/${fileName}`;
      setContent((current) => {
        const nextContent = structuredClone(current);
        setByPath(nextContent, uploadTarget, publicUrl);
        return nextContent;
      });
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStatus("照片上传成功，图片地址已自动填入。请点击底部“保存并部署”完成更新。");
    } catch (error) {
      setStatus(`${error.message}。请检查 Token 是否有该仓库 Contents 读写权限。`);
    } finally {
      setIsBusy(false);
    }
  };

  const changeValue = (path) => (value) => {
    setContent((current) => {
      const nextContent = structuredClone(current);
      setByPath(nextContent, path, value);
      return nextContent;
    });
  };

  const changeBrandName = (value) => {
    setContent((current) => {
      const nextContent = structuredClone(current);
      nextContent.brand.name = value;
      nextContent.hero.title = value;
      nextContent.footer.copyright = `© 2026 ${value}`;
      return nextContent;
    });
  };

  const changeList = (path) => (value) => {
    setContent((current) => {
      const nextContent = structuredClone(current);
      setByPath(nextContent, path, splitList(value));
      return nextContent;
    });
  };

  const changeItem = (path, index, field) => (value) => {
    setContent((current) => {
      const nextContent = structuredClone(current);
      const list = getByPath(nextContent, path);
      list[index] = {
        ...list[index],
        [field]: value
      };
      return nextContent;
    });
  };

  const changeItemList = (path, index, field) => (value) => {
    setContent((current) => {
      const nextContent = structuredClone(current);
      const list = getByPath(nextContent, path);
      list[index] = {
        ...list[index],
        [field]: splitList(value)
      };
      return nextContent;
    });
  };

  const currentTargetImage = getByPath(content, uploadTarget) || "";

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <span className="admin-kicker">
            <Github aria-hidden="true" />
            GitHub Pages 内容后台
          </span>
          <h1>网站后台</h1>
          <p>这里可以修改首页全部主要内容。保存后会提交到 GitHub 仓库，并自动重新部署线上网站。</p>
        </div>
        <a className="admin-site-link" href="/" target="_blank" rel="noreferrer">
          <Eye aria-hidden="true" />
          查看网站
        </a>
      </section>

      <section className="admin-card admin-token-card">
        <div>
          <h2>
            <KeyRound aria-hidden="true" />
            登录 GitHub
          </h2>
          <p>
            使用 Fine-grained personal access token，选择仓库 <strong>{REPO_OWNER}/{REPO_NAME}</strong>，
            权限给 <strong>Contents: Read and write</strong>。
          </p>
        </div>
        <label className="admin-field admin-token-field">
          <span>GitHub Token</span>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="粘贴 ghp_ 或 github_pat_ 开头的 Token"
            type="password"
          />
          <small>Token 只在当前浏览器里使用，不会保存到网站代码。</small>
        </label>
        <div className="admin-actions">
          <a
            className="admin-button admin-button-light"
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
          >
            创建 Token
          </a>
          <button className="admin-button" type="button" onClick={loadFromGithub} disabled={isBusy}>
            {isBusy ? <Loader2 className="spin" aria-hidden="true" /> : <Github aria-hidden="true" />}
            读取线上内容
          </button>
        </div>
      </section>

      <section className="admin-status" aria-live="polite">
        {status.includes("成功") ? <CheckCircle aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
        <span>{status}</span>
      </section>

      <section className="admin-card admin-upload-card">
        <div className="admin-upload-heading">
          <span className="admin-kicker">
            <ImagePlus aria-hidden="true" />
            墙板照片管理
          </span>
          <h2>上传并替换网页照片</h2>
          <p>支持 JPG、PNG、WebP，单张不超过 8MB。上传完成后再保存并部署。</p>
        </div>

        <div className="admin-upload-layout">
          <div className="admin-upload-controls">
            <label className="admin-field">
              <span>照片显示位置</span>
              <select value={uploadTarget} onChange={(event) => setUploadTarget(event.target.value)}>
                {IMAGE_TARGETS.map((target) => (
                  <option value={target.value} key={target.value}>
                    {target.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-file-picker">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
              />
              <ImagePlus aria-hidden="true" />
              <strong>{uploadFile ? uploadFile.name : "选择墙板照片"}</strong>
              <span>{uploadFile ? `${(uploadFile.size / 1024 / 1024).toFixed(1)}MB` : "JPG / PNG / WebP · 最大 8MB"}</span>
            </label>

            <button className="admin-button admin-button-save admin-upload-button" type="button" onClick={uploadPhoto} disabled={!canUpload}>
              {isBusy ? <Loader2 className="spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
              上传照片
            </button>
          </div>

          <div className="admin-upload-preview">
            {uploadPreview || currentTargetImage ? (
              <img src={uploadPreview || currentTargetImage} alt="墙板照片预览" />
            ) : (
              <div className="admin-upload-empty">
                <ImagePlus aria-hidden="true" />
                <span>照片预览</span>
              </div>
            )}
            <span className="admin-preview-label">{uploadPreview ? "待上传照片" : "当前网页照片"}</span>
          </div>
        </div>
      </section>

      <section className="admin-card admin-quick-card">
        <SectionHeader title="快捷修改" />
        <div className="admin-subgrid">
          <Field
            label="店名"
            value={content.brand.name}
            onChange={changeBrandName}
            hint="会同步到首页大标题和页脚版权"
          />
          <Field label="经验年限" value={content.stats[0]?.value ?? ""} onChange={changeItem("stats", 0, "value")} />
          <Field label="咨询电话" value={content.contact.phone} onChange={changeValue("contact.phone")} />
          <Field
            label="服务范围"
            value={content.contact.serviceRange}
            onChange={changeValue("contact.serviceRange")}
          />
          <Field
            label="首页介绍"
            value={content.hero.copy}
            onChange={changeValue("hero.copy")}
            multiline
            className="admin-field-full"
          />
          <Field
            label="展厅地址"
            value={content.contact.address}
            onChange={changeValue("contact.address")}
            multiline
            className="admin-field-full"
          />
          <Field
            label="门店预约标题"
            value={content.contact.title}
            onChange={changeValue("contact.title")}
            multiline
            className="admin-field-full"
          />
        </div>
      </section>

      <section className="admin-grid">
        <div className="admin-card">
          <SectionHeader title="品牌与导航" />
          <Field label="品牌名称" value={content.brand.name} onChange={changeValue("brand.name")} />
          <Field label="品牌副标题" value={content.brand.subtitle} onChange={changeValue("brand.subtitle")} />
          <div className="admin-divider" />
          <div className="admin-item-grid">
            {content.navItems.map((item, index) => (
              <div className="admin-item-editor" key={item.href}>
                <h3>导航 {index + 1}</h3>
                <Field label="显示文字" value={item.label} onChange={changeItem("navItems", index, "label")} />
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <SectionHeader title="首屏" />
          <Field label="首屏标签" value={content.hero.eyebrow} onChange={changeValue("hero.eyebrow")} />
          <Field label="首屏标题" value={content.hero.title} onChange={changeValue("hero.title")} />
          <Field label="首屏介绍" value={content.hero.copy} onChange={changeValue("hero.copy")} multiline />
          <Field label="主按钮文字" value={content.hero.primaryCta} onChange={changeValue("hero.primaryCta")} />
          <Field label="副按钮文字" value={content.hero.secondaryCta} onChange={changeValue("hero.secondaryCta")} />
          <Field
            label="首屏背景图 URL"
            value={content.hero.backgroundImage}
            onChange={changeValue("hero.backgroundImage")}
            multiline
          />
        </div>

        <div className="admin-card">
          <SectionHeader title="预约表单" />
          <Field label="表单标题" value={content.leadForm.title} onChange={changeValue("leadForm.title")} />
          <Field label="表单说明" value={content.leadForm.copy} onChange={changeValue("leadForm.copy")} multiline />
          <Field label="称呼标签" value={content.leadForm.nameLabel} onChange={changeValue("leadForm.nameLabel")} />
          <Field
            label="称呼提示"
            value={content.leadForm.namePlaceholder}
            onChange={changeValue("leadForm.namePlaceholder")}
          />
          <Field label="手机号标签" value={content.leadForm.phoneLabel} onChange={changeValue("leadForm.phoneLabel")} />
          <Field
            label="手机号提示"
            value={content.leadForm.phonePlaceholder}
            onChange={changeValue("leadForm.phonePlaceholder")}
          />
          <Field label="需求标签" value={content.leadForm.needLabel} onChange={changeValue("leadForm.needLabel")} />
          <Field
            label="下拉默认文字"
            value={content.leadForm.needPlaceholder}
            onChange={changeValue("leadForm.needPlaceholder")}
          />
          <Field
            label="下拉选项"
            value={joinList(content.leadForm.needOptions)}
            onChange={changeList("leadForm.needOptions")}
            hint="多个选项用英文逗号分隔"
            multiline
          />
          <Field label="按钮文字" value={content.leadForm.submitLabel} onChange={changeValue("leadForm.submitLabel")} />
          <Field label="表单备注" value={content.leadForm.note} onChange={changeValue("leadForm.note")} multiline />
        </div>

        <div className="admin-card">
          <SectionHeader title="服务数据" />
          <div className="admin-stat-grid">
            {content.stats.map((stat, index) => (
              <div className="admin-stat-editor" key={index}>
                <Field label={`数据 ${index + 1}`} value={stat.value} onChange={changeItem("stats", index, "value")} />
                <Field label="说明" value={stat.label} onChange={changeItem("stats", index, "label")} />
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card admin-card-wide">
          <SectionHeader title="空间方案" />
          <Field label="版块小标题" value={content.services.kicker} onChange={changeValue("services.kicker")} />
          <Field label="版块标题" value={content.services.title} onChange={changeValue("services.title")} multiline />
          <Field label="版块说明" value={content.services.copy} onChange={changeValue("services.copy")} multiline />
          <div className="admin-divider" />
          <div className="admin-item-grid">
            {content.services.cards.map((card, index) => (
              <div className="admin-item-editor" key={index}>
                <h3>方案卡片 {index + 1}</h3>
                <div className="admin-subgrid">
                  <Field label="标题" value={card.title} onChange={changeItem("services.cards", index, "title")} />
                  <Field
                    label="标签"
                    value={joinList(card.tags)}
                    onChange={changeItemList("services.cards", index, "tags")}
                    hint="多个标签用英文逗号分隔"
                  />
                  <Field
                    label="说明"
                    value={card.text}
                    onChange={changeItem("services.cards", index, "text")}
                    multiline
                    className="admin-field-full"
                  />
                  <Field
                    label="图片 URL"
                    value={card.image}
                    onChange={changeItem("services.cards", index, "image")}
                    multiline
                    className="admin-field-full"
                  />
                  <Field
                    label="图片描述"
                    value={card.alt}
                    onChange={changeItem("services.cards", index, "alt")}
                    className="admin-field-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card admin-card-wide">
          <SectionHeader title="定制流程" />
          <Field label="版块小标题" value={content.process.kicker} onChange={changeValue("process.kicker")} />
          <Field label="版块标题" value={content.process.title} onChange={changeValue("process.title")} multiline />
          <Field label="版块说明" value={content.process.copy} onChange={changeValue("process.copy")} multiline />
          <div className="admin-divider" />
          <div className="admin-item-grid">
            {content.process.steps.map((step, index) => (
              <div className="admin-item-editor" key={index}>
                <h3>流程 {index + 1}</h3>
                <div className="admin-subgrid">
                  <Field label="编号" value={step.number} onChange={changeItem("process.steps", index, "number")} />
                  <Field label="标题" value={step.title} onChange={changeItem("process.steps", index, "title")} />
                  <Field
                    label="说明"
                    value={step.text}
                    onChange={changeItem("process.steps", index, "text")}
                    multiline
                    className="admin-field-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card admin-card-wide">
          <SectionHeader title="实景案例" />
          <Field label="版块小标题" value={content.cases.kicker} onChange={changeValue("cases.kicker")} />
          <Field label="版块标题" value={content.cases.title} onChange={changeValue("cases.title")} multiline />
          <Field label="版块说明" value={content.cases.copy} onChange={changeValue("cases.copy")} multiline />
          <div className="admin-divider" />
          <div className="admin-item-editor">
            <h3>主案例</h3>
            <div className="admin-subgrid">
              <Field label="标题" value={content.cases.featured.title} onChange={changeValue("cases.featured.title")} />
              <Field
                label="图片描述"
                value={content.cases.featured.alt}
                onChange={changeValue("cases.featured.alt")}
              />
              <Field
                label="说明"
                value={content.cases.featured.text}
                onChange={changeValue("cases.featured.text")}
                multiline
                className="admin-field-full"
              />
              <Field
                label="图片 URL"
                value={content.cases.featured.image}
                onChange={changeValue("cases.featured.image")}
                multiline
                className="admin-field-full"
              />
            </div>
            <div className="admin-divider" />
            <div className="admin-subgrid">
              {content.cases.featured.facts.map((fact, index) => (
                <div className="admin-item-editor" key={index}>
                  <h3>主案例数据 {index + 1}</h3>
                  <Field
                    label="数值"
                    value={fact.value}
                    onChange={changeItem("cases.featured.facts", index, "value")}
                  />
                  <Field
                    label="说明"
                    value={fact.label}
                    onChange={changeItem("cases.featured.facts", index, "label")}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="admin-divider" />
          <div className="admin-item-grid">
            {content.cases.sideCards.map((card, index) => (
              <div className="admin-item-editor" key={index}>
                <h3>侧边案例 {index + 1}</h3>
                <div className="admin-subgrid">
                  <Field label="标题" value={card.title} onChange={changeItem("cases.sideCards", index, "title")} />
                  <Field label="图片描述" value={card.alt} onChange={changeItem("cases.sideCards", index, "alt")} />
                  <Field
                    label="说明"
                    value={card.text}
                    onChange={changeItem("cases.sideCards", index, "text")}
                    multiline
                    className="admin-field-full"
                  />
                  <Field
                    label="图片 URL"
                    value={card.image}
                    onChange={changeItem("cases.sideCards", index, "image")}
                    multiline
                    className="admin-field-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card admin-card-wide">
          <SectionHeader title="材料工艺" />
          <Field label="版块小标题" value={content.materials.kicker} onChange={changeValue("materials.kicker")} />
          <Field label="版块标题" value={content.materials.title} onChange={changeValue("materials.title")} multiline />
          <Field label="版块说明" value={content.materials.copy} onChange={changeValue("materials.copy")} multiline />
          <Field label="主图 URL" value={content.materials.image} onChange={changeValue("materials.image")} multiline />
          <Field label="主图描述" value={content.materials.alt} onChange={changeValue("materials.alt")} />
          <div className="admin-divider" />
          <div className="admin-item-grid">
            {content.materials.cards.map((card, index) => (
              <div className="admin-item-editor" key={index}>
                <h3>材料卡片 {index + 1}</h3>
                <div className="admin-subgrid">
                  <Field label="标题" value={card.title} onChange={changeItem("materials.cards", index, "title")} />
                  <Field
                    label="标签"
                    value={joinList(card.tags)}
                    onChange={changeItemList("materials.cards", index, "tags")}
                    hint="多个标签用英文逗号分隔"
                  />
                  <Field
                    label="色板"
                    value={joinList(card.swatches)}
                    onChange={changeItemList("materials.cards", index, "swatches")}
                    hint="可用 oak, walnut, mist, stone, clay, ink"
                  />
                  <Field
                    label="说明"
                    value={card.text}
                    onChange={changeItem("materials.cards", index, "text")}
                    multiline
                    className="admin-field-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card admin-card-wide">
          <SectionHeader title="预算估算器" />
          <div className="admin-subgrid">
            <Field label="标签" value={content.estimate.eyebrow} onChange={changeValue("estimate.eyebrow")} />
            <Field label="工具标题" value={content.estimate.boxTitle} onChange={changeValue("estimate.boxTitle")} />
            <Field
              label="版块标题"
              value={content.estimate.title}
              onChange={changeValue("estimate.title")}
              multiline
              className="admin-field-full"
            />
            <Field
              label="版块说明"
              value={content.estimate.copy}
              onChange={changeValue("estimate.copy")}
              multiline
              className="admin-field-full"
            />
            <Field
              label="背景图 URL"
              value={content.estimate.backgroundImage}
              onChange={changeValue("estimate.backgroundImage")}
              multiline
              className="admin-field-full"
            />
            <Field label="类型标签" value={content.estimate.spaceLabel} onChange={changeValue("estimate.spaceLabel")} />
            <Field label="面积标签" value={content.estimate.areaLabel} onChange={changeValue("estimate.areaLabel")} />
            <Field label="档位标签" value={content.estimate.levelLabel} onChange={changeValue("estimate.levelLabel")} />
            <Field label="结果标签" value={content.estimate.resultLabel} onChange={changeValue("estimate.resultLabel")} />
            <Field label="按钮文字" value={content.estimate.cta} onChange={changeValue("estimate.cta")} />
            <Field label="默认面积" value={content.estimate.defaultArea} onChange={changeValue("estimate.defaultArea")} />
          </div>
          <div className="admin-divider" />
          <div className="admin-subgrid">
            {content.estimate.spaceOptions.map((option, index) => (
              <div className="admin-item-editor" key={index}>
                <h3>定制类型 {index + 1}</h3>
                <Field label="显示文字" value={option.label} onChange={changeItem("estimate.spaceOptions", index, "label")} />
                <Field
                  label="单价数值"
                  value={option.value}
                  onChange={changeItem("estimate.spaceOptions", index, "value")}
                />
              </div>
            ))}
            {content.estimate.levelOptions.map((option, index) => (
              <div className="admin-item-editor" key={`level-${index}`}>
                <h3>配置档位 {index + 1}</h3>
                <Field label="显示文字" value={option.label} onChange={changeItem("estimate.levelOptions", index, "label")} />
                <Field
                  label="倍率数值"
                  value={option.value}
                  onChange={changeItem("estimate.levelOptions", index, "value")}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <SectionHeader title="门店信息" />
          <Field label="版块小标题" value={content.contact.kicker} onChange={changeValue("contact.kicker")} />
          <Field label="版块标题" value={content.contact.title} onChange={changeValue("contact.title")} multiline />
          <Field label="地址标题" value={content.contact.addressTitle} onChange={changeValue("contact.addressTitle")} />
          <Field label="电话标题" value={content.contact.phoneTitle} onChange={changeValue("contact.phoneTitle")} />
          <Field
            label="服务标题"
            value={content.contact.serviceRangeTitle}
            onChange={changeValue("contact.serviceRangeTitle")}
          />
          <Field label="展厅地址" value={content.contact.address} onChange={changeValue("contact.address")} multiline />
          <Field label="咨询电话" value={content.contact.phone} onChange={changeValue("contact.phone")} />
          <Field label="服务范围" value={content.contact.serviceRange} onChange={changeValue("contact.serviceRange")} />
          <Field label="门店图 URL" value={content.contact.image} onChange={changeValue("contact.image")} multiline />
          <Field label="门店图描述" value={content.contact.alt} onChange={changeValue("contact.alt")} />
        </div>

        <div className="admin-card">
          <SectionHeader title="联系表单、提示和页脚" />
          <Field label="称呼标签" value={content.contact.formNameLabel} onChange={changeValue("contact.formNameLabel")} />
          <Field
            label="称呼提示"
            value={content.contact.formNamePlaceholder}
            onChange={changeValue("contact.formNamePlaceholder")}
          />
          <Field label="手机号标签" value={content.contact.formPhoneLabel} onChange={changeValue("contact.formPhoneLabel")} />
          <Field
            label="手机号提示"
            value={content.contact.formPhonePlaceholder}
            onChange={changeValue("contact.formPhonePlaceholder")}
          />
          <Field
            label="留言标签"
            value={content.contact.formMessageLabel}
            onChange={changeValue("contact.formMessageLabel")}
          />
          <Field
            label="留言提示"
            value={content.contact.formMessagePlaceholder}
            onChange={changeValue("contact.formMessagePlaceholder")}
            multiline
          />
          <Field label="按钮文字" value={content.contact.formButton} onChange={changeValue("contact.formButton")} />
          <Field label="提交成功提示" value={content.toast.message} onChange={changeValue("toast.message")} multiline />
          <Field label="版权文字" value={content.footer.copyright} onChange={changeValue("footer.copyright")} />
          <Field label="页脚标语" value={content.footer.slogan} onChange={changeValue("footer.slogan")} />
        </div>
      </section>

      <section className="admin-savebar">
        <div>
          <strong>保存改动</strong>
          <span>{lastSavedAt ? `上次保存：${lastSavedAt}` : "保存会生成一次 GitHub 提交并触发部署。"}</span>
        </div>
        <button className="admin-button admin-button-save" type="button" onClick={saveToGithub} disabled={!canSave}>
          {isBusy ? <Loader2 className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          保存并部署
        </button>
      </section>
    </main>
  );
}
