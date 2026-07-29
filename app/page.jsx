"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Factory,
  Hammer,
  Layers3,
  Menu,
  MessageCircle,
  Phone,
  Ruler,
  Send,
  ShieldCheck,
  Sparkles,
  SwatchBook,
  X
} from "lucide-react";
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from "./siteContent";

const promiseIcons = [Clock3, Factory, Hammer, ShieldCheck];

const getPhoneHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, "")}`;

const getMapLinks = (address) => {
  const query = encodeURIComponent(address);

  return [
    { label: "高德地图", href: `https://uri.amap.com/search?keyword=${query}` },
    { label: "百度地图", href: `https://api.map.baidu.com/geocoder?address=${query}&output=html` },
    { label: "苹果地图", href: `https://maps.apple.com/?q=${query}` }
  ];
};

const money = (value) =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);

function WallPanelScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.65, 7.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const wallMaterials = [
      new THREE.MeshPhysicalMaterial({
        color: 0xb89062,
        roughness: 0.72,
        metalness: 0.04,
        clearcoat: 0.08
      }),
      new THREE.MeshPhysicalMaterial({
        color: 0xd8d7cf,
        roughness: 0.62,
        metalness: 0.02
      }),
      new THREE.MeshPhysicalMaterial({
        color: 0x363f3e,
        roughness: 0.56,
        metalness: 0.12
      }),
      new THREE.MeshPhysicalMaterial({
        color: 0x8f7968,
        roughness: 0.78,
        metalness: 0.03
      })
    ];

    [-2.25, -0.75, 0.75, 2.25].forEach((x, index) => {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 3.8, 0.16),
        wallMaterials[index]
      );
      panel.position.set(x, index % 2 ? 0.12 : -0.08, 0);
      panel.rotation.y = (index - 1.5) * 0.1;
      group.add(panel);

      const groove = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 3.86, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x101515 })
      );
      groove.position.set(x + 0.55, panel.position.y, 0.03);
      group.add(groove);
    });

    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(4.7, 0.045, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xd8a85d })
    );
    accent.position.set(0, -1.52, 0.18);
    group.add(accent);

    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(-3, 5, 5);
    scene.add(keyLight);
    const warmLight = new THREE.PointLight(0xd8a85d, 18, 9);
    warmLight.position.set(3.2, 1.8, 2.5);
    scene.add(warmLight);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frame = 0;
    let rafId = 0;
    const animate = () => {
      frame += 0.008;
      group.rotation.y = Math.sin(frame) * 0.08;
      group.rotation.x = Math.sin(frame * 0.7) * 0.025;
      accent.scale.x = 0.96 + Math.sin(frame * 1.7) * 0.035;
      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      renderer.dispose();
      wallMaterials.forEach((material) => material.dispose());
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="three-stage" ref={mountRef} aria-hidden="true" />;
}

function TagRow({ tags = [] }) {
  return (
    <div className="tag-row">
      {tags.map((tag) => (
        <span className="tag" key={tag}>{tag}</span>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [content, setContent] = useState(DEFAULT_SITE_CONTENT);
  const [estimate, setEstimate] = useState({
    area: DEFAULT_SITE_CONTENT.estimate.defaultArea,
    material: DEFAULT_SITE_CONTENT.estimate.defaultMaterial,
    complexity: DEFAULT_SITE_CONTENT.estimate.defaultComplexity
  });

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    let mounted = true;
    fetch("/site-content.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("content not found");
        return response.json();
      })
      .then((payload) => {
        if (!mounted) return;
        const merged = mergeSiteContent(payload);
        setContent(merged);
        setEstimate({
          area: merged.estimate.defaultArea,
          material: merged.estimate.defaultMaterial,
          complexity: merged.estimate.defaultComplexity
        });
      })
      .catch(() => mounted && setContent(DEFAULT_SITE_CONTENT));

    return () => { mounted = false; };
  }, []);

  const navItems = content.navItems;
  const material = content.materials.cards[activeMaterial] ?? content.materials.cards[0];
  const phoneHref = getPhoneHref(content.contact.phone);
  const mapLinks = getMapLinks(content.contact.address);
  const estimateRange = useMemo(() => {
    const area = Math.max(6, Number(estimate.area || 0));
    const materialUnit = Number(estimate.material);
    const complexity = Number(estimate.complexity);
    const base = area * materialUnit * complexity;
    return `${money(base)} - ${money(base * 1.18)}`;
  }, [estimate]);

  const updateEstimate = (event) => {
    const { id, value } = event.target;
    setEstimate((current) => ({ ...current, [id]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    setToastVisible(true);
    window.clearTimeout(handleSubmit.timer);
    handleSubmit.timer = window.setTimeout(() => setToastVisible(false), 3200);
  };

  return (
    <>
      <header className="topbar">
        <nav className="nav shell" aria-label="主导航">
          <a className="brand" href="#top" aria-label={`${content.brand.name} 首页`}>
            <img className="brand-logo" src="/kesheng-logo.jpg" alt={content.brand.name} />
            <span>
              <strong>{content.brand.name}</strong>
              <small>{content.brand.subtitle}</small>
            </span>
          </a>

          <div className={`nav-links ${menuOpen ? "open" : ""}`} id="site-nav">
            {navItems.map((item) => (
              <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
            ))}
          </div>

          <a className="nav-phone" href={phoneHref}>
            <Phone aria-hidden="true" />
            <span>{content.contact.phone}</span>
          </a>

          <button
            className="icon-button menu-toggle"
            type="button"
            title={menuOpen ? "关闭菜单" : "打开菜单"}
            aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <img className="hero-bg" src={content.hero.backgroundImage} alt="" />
          <WallPanelScene />
          <div className="hero-shade" />

          <div className="hero-content shell">
            <p className="eyebrow"><Sparkles aria-hidden="true" /> {content.hero.eyebrow}</p>
            <h1>{content.hero.title}</h1>
            <p className="hero-copy">{content.hero.copy}</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={phoneHref}>
                {content.hero.primaryCta}
                <ArrowDownRight aria-hidden="true" />
              </a>
              <a className="text-link light" href="#materials">
                {content.hero.secondaryCta}
                <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="hero-metrics shell">
            {content.stats.map((item) => (
              <span key={item.label}>
                <strong>{item.value}</strong>
                {item.label}
              </span>
            ))}
            <span className="hero-scroll">向下浏览 <ArrowDownRight aria-hidden="true" /></span>
          </div>
        </section>

        <section className="ticker" aria-label="主营材料">
          <div>
            <span>碳晶板</span><i />
            <span>防撞板</span><i />
            <span>SPC板</span><i />
            <span>快家整装</span><i />
            <span>全屋墙板定制</span><i />
            <span>碳晶板</span><i />
            <span>防撞板</span><i />
            <span>SPC板</span>
          </div>
        </section>

        <section className="section products" id="products">
          <div className="shell">
            <div className="section-heading">
              <span>01 / PRODUCT SYSTEM</span>
              <div>
                <h2>{content.products.title}</h2>
                <p>{content.products.copy}</p>
              </div>
            </div>

            <div className="product-grid">
              {content.products.cards.map((card, index) => (
                <article className={index === 0 ? "product-card large" : "product-card"} key={card.title}>
                  <img src={card.image} alt={card.alt} loading={index === 0 ? "eager" : "lazy"} />
                  <div className="product-copy">
                    <span>0{index + 1}</span>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                    <TagRow tags={card.tags} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section dark-section" id="materials">
          <div className="shell">
            <div className="section-heading invert">
              <span>02 / MATERIAL LAB</span>
              <div>
                <h2>{content.materials.title}</h2>
                <p>{content.materials.copy}</p>
              </div>
            </div>

            <div className="material-lab">
              <div className="material-tabs" role="tablist" aria-label="材料分类">
                {content.materials.cards.map((item, index) => (
                  <button
                    className={activeMaterial === index ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={activeMaterial === index}
                    key={item.title}
                    onClick={() => setActiveMaterial(index)}
                  >
                    <span>0{index + 1}</span>
                    {item.title}
                    <ChevronRight aria-hidden="true" />
                  </button>
                ))}
              </div>

              <div className="material-display">
                <div className="material-image">
                  <img src={material.image} alt={material.alt} loading="lazy" />
                  <span>{material.label}</span>
                </div>
                <div className="material-detail">
                  <span className="detail-label">SAMPLE NOTE</span>
                  <h3>{material.title}</h3>
                  <p>{material.text}</p>
                  <TagRow tags={material.tags} />
                  <div className="swatches" aria-label="饰面色板">
                    {material.swatches.map((swatch) => (
                      <span className={`swatch ${swatch}`} key={swatch} />
                    ))}
                  </div>
                  <a className="text-link light" href="#contact">
                    预约看实体样板
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section fast-fit" id="fast-fit">
          <div className="shell split-layout">
            <div>
              <span className="section-kicker">03 / QUICK HOME FITOUT</span>
              <h2>{content.fastFit.title}</h2>
              <p>{content.fastFit.copy}</p>
              <div className="promise-grid">
                {content.fastFit.promises.map((item, index) => {
                  const PromiseIcon = promiseIcons[index] ?? BadgeCheck;

                  return (
                    <div className="promise" key={item.title}>
                      <PromiseIcon aria-hidden="true" />
                      <strong>{item.title}</strong>
                      <span>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="fitout-image">
              <img src={content.fastFit.image} alt={content.fastFit.alt} loading="lazy" />
              <div>
                <strong>48h</strong>
                <span>初步方案响应</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section cases" id="cases">
          <div className="shell">
            <div className="section-heading">
              <span>04 / REAL HOME CASES</span>
              <div>
                <h2>{content.cases.title}</h2>
                <p>{content.cases.copy}</p>
              </div>
            </div>

            <div className="case-row">
              {content.cases.cards.map((card, index) => (
                <article key={card.title}>
                  <img src={card.image} alt={card.alt} loading="lazy" />
                  <span>CASE 00{index + 1}</span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section process dark-section" id="process">
          <div className="shell process-layout">
            <div>
              <span className="section-kicker light-kicker">05 / INSTALLATION</span>
              <h2>{content.process.title}</h2>
              <p>{content.process.copy}</p>
            </div>

            <div className="process-list">
              {content.process.steps.map((step) => (
                <article key={step.number}>
                  <span>{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                  <ArrowUpRight aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section estimate" id="estimate">
          <div className="shell estimate-layout">
            <div>
              <span className="section-kicker">06 / BUDGET</span>
              <h2>{content.estimate.title}</h2>
              <p>{content.estimate.copy}</p>
            </div>

            <form className="estimate-panel" aria-label="预算估算">
              <div className="panel-top">
                <Calculator aria-hidden="true" />
                <span>{content.estimate.boxTitle}</span>
              </div>
              <label htmlFor="area">
                <span>{content.estimate.areaLabel}</span>
                <input id="area" type="number" min="6" max="240" value={estimate.area} onChange={updateEstimate} />
              </label>
              <label htmlFor="material">
                <span>{content.estimate.materialLabel}</span>
                <select id="material" value={estimate.material} onChange={updateEstimate}>
                  {content.estimate.materialOptions.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label htmlFor="complexity">
                <span>{content.estimate.complexityLabel}</span>
                <select id="complexity" value={estimate.complexity} onChange={updateEstimate}>
                  {content.estimate.complexityOptions.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <div className="estimate-result">
                <span>{content.estimate.resultLabel}</span>
                <strong>{estimateRange}</strong>
              </div>
              <a className="btn btn-dark" href="#contact">
                带预算咨询
                <MessageCircle aria-hidden="true" />
              </a>
            </form>
          </div>
        </section>

        <section className="contact" id="contact">
          <div className="shell contact-layout">
            <div>
              <span className="section-kicker">07 / CONTACT</span>
              <h2>{content.contact.title}</h2>
              <div className="contact-lines">
                <a href={phoneHref}><Phone aria-hidden="true" /> {content.contact.phone}</a>
                <p><Ruler aria-hidden="true" /> {content.contact.serviceRange}</p>
                <div className="map-line">
                  <BadgeCheck aria-hidden="true" />
                  <div>
                    <strong>{content.contact.address}</strong>
                    <span>
                      {mapLinks.map((link) => (
                        <a href={link.href} key={link.label} target="_blank" rel="noreferrer">
                          {link.label}
                        </a>
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <form className="lead-form" onSubmit={handleSubmit}>
              <label htmlFor="contactName">
                <span>{content.contact.formNameLabel}</span>
                <input id="contactName" name="name" placeholder={content.contact.formNamePlaceholder} required />
              </label>
              <label htmlFor="contactPhone">
                <span>{content.contact.formPhoneLabel}</span>
                <input id="contactPhone" name="phone" inputMode="tel" placeholder={content.contact.formPhonePlaceholder} required />
              </label>
              <label htmlFor="contactMessage">
                <span>{content.contact.formMessageLabel}</span>
                <textarea id="contactMessage" name="message" placeholder={content.contact.formMessagePlaceholder} />
              </label>
              <button className="btn btn-primary" type="submit">
                {content.contact.formButton}
                <Send aria-hidden="true" />
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell">
          <strong>{content.brand.name}</strong>
          <span>{content.footer.copyright} / {content.footer.slogan}</span>
          <a href="#top">回到顶部 <ArrowUpRight aria-hidden="true" /></a>
        </div>
      </footer>

      <div className={`toast ${toastVisible ? "show" : ""}`} role="status" aria-live="polite">
        <CheckCircle2 aria-hidden="true" />
        <span>{content.toast.message}</span>
      </div>
    </>
  );
}
