"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { EN, EN_PATTERNS, TITLE_SUFFIXES, TRANSLATABLE_ATTRIBUTES } from "@/lib/translations";

// Översätter hela sajten i DOM:en i stället för att varje komponent bär två
// språkvarianter. Uppslaget sker på exakt text, så fondnamn, belopp och annan
// användardata rörs aldrig. Noder som React byter ut fångas av observern.
//
// Sätt data-no-translate på en nod som aldrig ska röras.

// Radbrytningar och indrag i JSX blir mellanslag i DOM:en. Nycklarna i ordboken
// är normaliserade, så uppslaget måste normalisera på samma sätt.
function normalize(value: string) {
  return value.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

// Efterföljande skiljetecken varierar mellan anropsplatserna ("Avgift" vs
// "Avgift:"). Slå upp basformen och sätt tillbaka tecknet.
const TRAILING = /^(.*?)([.:;,!?…]+)$/;

function lookup(source: string): string | undefined {
  const key = normalize(source);
  if (!key) return undefined;

  const direct = EN[key];
  if (direct) return direct;

  const trailing = TRAILING.exec(key);
  if (trailing) {
    const base = EN[trailing[1].trim()];
    if (base) return base + trailing[2];
  }

  for (const [pattern, replacement] of EN_PATTERNS) {
    const match = pattern.exec(key);
    if (!match) continue;
    if (typeof replacement === "string") return key.replace(pattern, replacement);
    // Delfraser som själva är svenska slås upp rekursivt; saknas de i ordboken
    // lämnas de orörda hellre än att halva meningen tappas.
    return replacement(match.slice(1), (fragment) => lookup(fragment) ?? fragment);
  }

  // "Bygg din portfölj – Sharpa" → basdelen översätts, suffixet står kvar.
  for (const suffix of TITLE_SUFFIXES) {
    if (!key.endsWith(suffix)) continue;
    const base = lookup(key.slice(0, -suffix.length));
    if (base) return base + suffix;
  }

  return undefined;
}

// Behåll ledande/efterföljande blanksteg — de bär layout i inline-flöden.
function translateText(source: string, english: boolean) {
  if (!english) return source;
  const leading = source.length - source.trimStart().length;
  const trailing = source.length - source.trimEnd().length;
  const core = source.slice(leading, source.length - trailing);
  const translated = lookup(core);
  if (!translated) return source;
  return source.slice(0, leading) + translated + source.slice(source.length - trailing);
}

type NodeState = { source: string; written: string };

const textState = new WeakMap<Text, NodeState>();
const attributeState = new WeakMap<Element, Map<string, NodeState>>();

const SKIP = "script, style, noscript, textarea, code, pre, [data-no-translate]";

function translateTextNode(node: Text, english: boolean) {
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP)) return;

  let state = textState.get(node);
  // Har React skrivit om noden sedan vi rörde den senast är det en ny källtext.
  if (!state || node.data !== state.written) state = { source: node.data, written: node.data };

  const next = translateText(state.source, english);
  if (node.data !== next) node.data = next;
  textState.set(node, { source: state.source, written: next });
}

function translateAttributes(element: Element, english: boolean) {
  if (element.closest(SKIP)) return;
  let saved = attributeState.get(element);
  if (!saved) {
    saved = new Map();
    attributeState.set(element, saved);
  }
  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (current === null) continue;
    let state = saved.get(attribute);
    if (!state || current !== state.written) state = { source: current, written: current };
    const next = translateText(state.source, english);
    if (element.getAttribute(attribute) !== next) element.setAttribute(attribute, next);
    saved.set(attribute, { source: state.source, written: next });
  }
}

function translateTree(root: Node, english: boolean) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, english);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const node of texts) translateTextNode(node, english);

  if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root as Element, english);
  for (const element of (root as Element).querySelectorAll("*")) {
    translateAttributes(element, english);
  }
}

// Sidtiteln ligger utanför body och missas av trädvandringen.
let titleState: NodeState | null = null;
function translateTitle(english: boolean) {
  const current = document.title;
  if (!titleState || current !== titleState.written) titleState = { source: current, written: current };
  const next = translateText(titleState.source, english);
  if (document.title !== next) document.title = next;
  titleState = { source: titleState.source, written: next };
}

export default function SiteTranslator() {
  const { language, isEnglish } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
    translateTree(document.body, isEnglish);
    translateTitle(isEnglish);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => translateTree(node, isEnglish));
        } else if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text, isEnglish);
        } else if (mutation.type === "attributes" && mutation.target.nodeType === Node.ELEMENT_NODE) {
          translateAttributes(mutation.target as Element, isEnglish);
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    // Next byter ut hela <title>-elementet vid navigering, så observern måste
    // sitta på head — en referens till elementet blir inaktuell direkt.
    const titleObserver = new MutationObserver(() => translateTitle(isEnglish));
    titleObserver.observe(document.head, { childList: true, characterData: true, subtree: true });

    return () => {
      observer.disconnect();
      titleObserver.disconnect();
    };
  }, [language, isEnglish]);

  return null;
}
