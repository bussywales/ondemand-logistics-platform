"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { Play } from "@phosphor-icons/react/dist/csr/Play";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Cube } from "@phosphor-icons/react/dist/csr/Cube";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { Users } from "@phosphor-icons/react/dist/csr/Users";
import { Truck } from "@phosphor-icons/react/dist/csr/Truck";
import { List } from "@phosphor-icons/react/dist/csr/List";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { chipparStages, nextChipparStage } from "./chippar-demo";
import { PublicAnalyticsPageView } from "./public-analytics-page-view";
import styles from "./chippar-landing.module.css";

const benefits = [
  {
    Icon: Cube,
    title: "Orders together",
    text: "A single view from order to delivery, across your operation.",
  },
  {
    Icon: Warning,
    title: "Exceptions visible",
    text: "Spot what needs attention, early.",
  },
  {
    Icon: Users,
    title: "Handoffs clear",
    text: "Everyone knows the next step.",
  },
];

export function ChipparLanding() {
  const [selected, setSelected] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const tourButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const stage = chipparStages[selected];
  const openTour = () => {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : tourButton.current;
    dialog.current?.showModal();
  };
  const closeTour = () => dialog.current?.close();

  return (
    <main className={styles.page}>
      <PublicAnalyticsPageView page="landing" />
      <a className={styles.skip} href="#product">
        Skip to product
      </a>
      <div className={styles.inner}>
        <header className={styles.header}>
          <a href="/" className={styles.wordmark} aria-label="Chippar home">
            Chippar
          </a>
          <nav aria-label="Primary navigation" className={styles.desktopNav}>
            <a href="#product">Product</a>
            <a href="#operators">For operators</a>
            <a href="/demo/request?interest=pilot">Pilot programme</a>
          </nav>
          <div className={styles.headerActions}>
            <a href="/get-started" className={styles.login}>
              Log in
            </a>
            <a href="/demo/request" className={styles.primary}>
              Book a walkthrough <ArrowRight size={20} aria-hidden="true" />
            </a>
          </div>
          <button
            ref={menuButton}
            type="button"
            className={styles.menuToggle}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="chippar-mobile-nav"
            onKeyDown={(event) => {
              if (event.key === "Escape") setMenuOpen(false);
            }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X size={24} aria-hidden="true" />
            ) : (
              <List size={24} aria-hidden="true" />
            )}
          </button>
          {menuOpen && (
            <nav
              id="chippar-mobile-nav"
              aria-label="Mobile navigation"
              className={styles.mobileNav}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setMenuOpen(false);
                  menuButton.current?.focus();
                }
              }}
            >
              <a href="#product" onClick={() => setMenuOpen(false)}>
                Product
              </a>
              <a href="#operators" onClick={() => setMenuOpen(false)}>
                For operators
              </a>
              <a href="/demo/request?interest=pilot">Pilot programme</a>
              <a href="/get-started">Log in</a>
              <a href="/demo/request">Book a walkthrough</a>
            </nav>
          )}
        </header>
        <section className={styles.hero} aria-labelledby="chippar-heading">
          <p className={styles.eyebrow}>Local commerce. Better together.</p>
          <h1 id="chippar-heading">
            Keep local
            <br />
            commerce moving.
          </h1>
          <div className={styles.heroBottom}>
            <div>
              <p className={styles.intro}>
                One shared view of orders, delivery progress and the next
                <br className={styles.desktopBreak} /> action your team needs to
                take.
              </p>
              <div className={styles.heroActions}>
                <a href="/demo/request" className={styles.primary}>
                  Book a walkthrough <ArrowRight size={21} aria-hidden="true" />
                </a>
                <button
                  ref={tourButton}
                  type="button"
                  className={styles.tour}
                  onClick={openTour}
                >
                  <span className={styles.play}>
                    <Play size={16} weight="fill" aria-hidden="true" />
                  </span>
                  Explore product tour
                </button>
              </div>
            </div>
            <p className={styles.networkCaption}>
              Operators <span>/</span> Merchants <span>/</span> Couriers
              <br />
              <small>Same orders. A clearer way forward.</small>
            </p>
          </div>
        </section>
        <section
          id="product"
          className={styles.product}
          aria-label="Illustrative order workflow"
        >
          <div className={styles.sequence}>
            <p className={styles.demoLabel}>
              <strong>DEMO104</strong>
              <span>Illustrative demo, not live data</span>
            </p>
            <div
              className={styles.stages}
              role="group"
              aria-label="Choose an illustrative workflow stage"
            >
              {chipparStages.map((item, index) => (
                <button
                  type="button"
                  key={item.label}
                  className={[
                    styles.stage,
                    index === selected ? styles.selected : "",
                    index === 0 ? styles.received : "",
                  ].join(" ")}
                  aria-pressed={index === selected}
                  aria-controls="chippar-order-detail"
                  onClick={() => setSelected(index)}
                >
                  <span className={styles.stageLabel}>
                    <span className={styles.number}>
                      {index === 0 ? (
                        <Check size={16} weight="bold" aria-hidden="true" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    {item.label}
                  </span>
                  <Image
                    src={`/brand/chippar/${item.image}`}
                    data-asset={item.image}
                    alt={item.alt}
                    width={360}
                    height={292}
                    sizes="(max-width: 540px) 44vw, (max-width: 900px) 22vw, 180px"
                    className={styles.stageImage}
                  />
                  {index < chipparStages.length - 1 && (
                    <ArrowRight
                      className={styles.connector}
                      size={36}
                      weight="thin"
                      aria-hidden="true"
                    />
                  )}
                  <span className={styles.stageStatus}>{item.status}</span>
                  <span className={styles.stageTime}>{item.time}</span>
                </button>
              ))}
            </div>
          </div>
          <aside
            id="chippar-order-detail"
            className={styles.inspector}
            aria-label="Illustrative order details"
          >
            <div className={styles.inspectorTop}>
              <span>DEMO104</span>
              <span>{stage.label}</span>
            </div>
            <div
              className={styles.inspectorStatus}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className={styles.statusIcon}>
                <Truck size={26} aria-hidden="true" />
              </span>
              <div key={selected} className={styles.statusCopy}>
                <h2>{stage.heading}</h2>
                <p>{stage.detail}</p>
              </div>
            </div>
            <dl className={styles.details}>
              <div>
                <dt>Order</dt>
                <dd>DEMO104</dd>
              </div>
              <div>
                <dt>Merchant</dt>
                <dd>Riverside Kitchen</dd>
              </div>
              <div>
                <dt>Pickup</dt>
                <dd>Riverside Kitchen</dd>
              </div>
              <div>
                <dt>Drop-off</dt>
                <dd>2.3 km · Local area</dd>
              </div>
              <div>
                <dt>Package</dt>
                <dd>1 item · Standard</dd>
              </div>
            </dl>
            <button
              type="button"
              className={styles.review}
              onClick={() => {
                if (selected === chipparStages.length - 1) {
                  setSelected(1);
                } else {
                  openTour();
                }
              }}
            >
              {stage.action} <ArrowRight size={18} aria-hidden="true" />
            </button>
          </aside>
        </section>
        <section
          id="operators"
          className={styles.benefits}
          aria-label="Built for connected operations"
        >
          {benefits.map(({ Icon, title, text }) => (
            <article key={title} className={styles.benefit}>
              <Icon size={38} weight="light" aria-hidden="true" />
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </section>
        <footer className={styles.footer}>
          <a href="/" className={styles.footerBrand}>
            Chippar
          </a>
          <p>Built for a more connected local economy.</p>
          <a href="/pricing">
            Explore the pilot <ArrowRight size={14} aria-hidden="true" />
          </a>
        </footer>
      </div>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="chippar-tour-title"
        onClose={() => returnFocus.current?.focus()}
        onClick={(event) => {
          if (event.target === dialog.current) closeTour();
        }}
      >
        <div className={styles.dialogContent}>
          <div className={styles.dialogHeader}>
            <p className={styles.eyebrow}>A closer look</p>
            <button
              type="button"
              onClick={closeTour}
              aria-label="Close product tour"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>
          <p className={styles.demoLabel}>
            Illustrative demo · No live order or action
          </p>
          <h2 id="chippar-tour-title">{stage.heading}</h2>
          <Image
            src={`/brand/chippar/${stage.image}`}
            alt={stage.alt}
            width={600}
            height={320}
            sizes="(max-width: 640px) 90vw, 560px"
          />
          <p>{stage.description}</p>
          <div
            className={styles.dialogSteps}
            role="group"
            aria-label="Tour stages"
          >
            {chipparStages.map((item, index) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
              >
                {index + 1}. {item.label}
              </button>
            ))}
          </div>
          <div className={styles.dialogActions}>
            <button
              className={styles.primary}
              type="button"
              onClick={() => setSelected(nextChipparStage(selected))}
            >
              {selected === 3 ? "Back to dispatch" : "Next stage"}{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <a href="/demo/request">Book a walkthrough</a>
          </div>
        </div>
      </dialog>
    </main>
  );
}
