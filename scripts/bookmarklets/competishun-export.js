/* Export the questions on a Competishun PYQ page as JSON (for the Education+ question bank).
   Use: open the chapter, open every "Written Solution" (the "Open all solutions" bookmarklet),
   then run this. It downloads <chapter>.json. Built into a bookmarklet with build-bookmarklet.mjs.

   Maths on the page is MathJax SVG (as <img class="math-svg"> or inline <svg>). Each glyph keeps
   its Unicode code (data-c) and each element its MathML role (data-mml-node), so the LaTeX is
   rebuilt exactly instead of guessed. */
(async () => {
  const GREEK = { "391": "A", "392": "B", "393": "\\Gamma", "394": "\\Delta", "398": "\\Theta", "39B": "\\Lambda", "39E": "\\Xi", "3A0": "\\Pi", "3A3": "\\Sigma", "3A6": "\\Phi", "3A8": "\\Psi", "3A9": "\\Omega", "3B1": "\\alpha", "3B2": "\\beta", "3B3": "\\gamma", "3B4": "\\delta", "3B5": "\\epsilon", "3F5": "\\epsilon", "3B6": "\\zeta", "3B7": "\\eta", "3B8": "\\theta", "3D1": "\\vartheta", "3B9": "\\iota", "3BA": "\\kappa", "3BB": "\\lambda", "3BC": "\\mu", "3BD": "\\nu", "3BE": "\\xi", "3C0": "\\pi", "3C1": "\\rho", "3C3": "\\sigma", "3C4": "\\tau", "3C5": "\\upsilon", "3C6": "\\phi", "3D5": "\\phi", "3C7": "\\chi", "3C8": "\\psi", "3C9": "\\omega" };
  const SYM = { "2212": "-", "D7": "\\times ", "22C5": "\\cdot ", "B7": "\\cdot ", "F7": "\\div ", "B1": "\\pm ", "2213": "\\mp ", "2218": "\\circ ", "2192": "\\rightarrow ", "2190": "\\leftarrow ", "2194": "\\leftrightarrow ", "21D2": "\\Rightarrow ", "2264": "\\leq ", "2265": "\\geq ", "2260": "\\neq ", "2248": "\\approx ", "2261": "\\equiv ", "221D": "\\propto ", "221E": "\\infty ", "2220": "\\angle ", "B0": "^{\\circ}", "2032": "'", "2033": "''", "2211": "\\sum ", "220F": "\\prod ", "222B": "\\int ", "222E": "\\oint ", "2202": "\\partial ", "2207": "\\nabla ", "2208": "\\in ", "2209": "\\notin ", "222A": "\\cup ", "2229": "\\cap ", "2282": "\\subset ", "2286": "\\subseteq ", "22A5": "\\perp ", "2225": "\\parallel ", "2016": "\\| ", "2223": "|", "2026": "\\ldots ", "22EF": "\\cdots ", "2234": "\\therefore ", "2200": "\\forall ", "2203": "\\exists ", "2205": "\\emptyset ", "211D": "\\mathbb{R}", "2115": "\\mathbb{N}", "2124": "\\mathbb{Z}", "2124 ": "", "A0": " ", "2061": "", "2062": "", "2063": "", "200B": "", "7B": "\\{", "7D": "\\}", "25": "\\%", "23": "\\#", "26": "\\&", "2329": "\\langle ", "232A": "\\rangle ", "27E8": "\\langle ", "27E9": "\\rangle ", "230A": "\\lfloor ", "230B": "\\rfloor ", "2308": "\\lceil ", "2309": "\\rceil ", "210F": "\\hbar ", "2113": "\\ell " };
  const FUNCS = ["sin", "cos", "tan", "cot", "sec", "csc", "cosec", "log", "ln", "exp", "lim", "max", "min", "sinh", "cosh", "tanh", "det"];
  const warn = [];

  /* One glyph code (hex) -> LaTeX. Math italic / bold letters (U+1D400..) map back to ASCII. */
  const glyph = (hex) => {
    const cp = parseInt(hex, 16);
    if (cp >= 0x1d400 && cp <= 0x1d6a3) {
      const off = (cp - 0x1d400) % 52;
      return String.fromCharCode(off < 26 ? 65 + off : 97 + off - 26);
    }
    if (cp === 0x210e) return "h";
    if (cp === 0x131) return "i"; /* dotless i / j under a hat */
    if (cp === 0x237) return "j";
    /* Math italic / bold Greek (U+1D6A8..): blocks of 58 = 25 capitals, nabla, 25 small, then ∂ ϵ ϑ ϰ ϕ ϱ ϖ */
    if (cp >= 0x1d6a8 && cp <= 0x1d7c9) {
      const off = (cp - 0x1d6a8) % 58;
      if (off < 25) return glyph((0x391 + off + (off >= 17 ? 1 : 0)).toString(16));
      if (off === 25) return "\\nabla ";
      if (off < 51) return glyph((0x3b1 + off - 26).toString(16));
      return ["\\partial ", "\\epsilon ", "\\vartheta ", "\\kappa ", "\\phi ", "\\rho ", "\\varpi "][off - 51];
    }
    const h = hex.toUpperCase().replace(/^0+/, "");
    if (GREEK[h]) return GREEK[h] + " ";
    if (h in SYM) return SYM[h];
    return String.fromCodePoint(cp);
  };
  /* MathML children of a node: MathJax sometimes wraps them in unlabelled <g> (e.g. the
     radicand of a square root), so look through those. */
  const kids = (g) =>
    Array.from(g.children).flatMap((c) => (!c.getAttribute ? [] : c.getAttribute("data-mml-node") ? [c] : c.tagName.toLowerCase() === "g" ? kids(c) : []));
  const chars = (g) => Array.from(g.querySelectorAll("[data-c]")).map((e) => glyph(e.getAttribute("data-c"))).join("");
  const br = (s) => (s.length === 1 ? s : "{" + s + "}");
  const over = (g) => {
    const accent = chars(g).trim();
    if (/\\rightarrow|^⃗$|^→$/.test(accent) || accent === "⃗") return "\\vec";
    if (/^\^$|^ˆ$|^̂$/.test(accent)) return "\\hat";
    if (/^[¯‾―—_̄-]$/.test(accent) || accent === "-") return "\\bar";
    if (/^[˙̇.]$/.test(accent)) return "\\dot";
    if (/^[~˜̃]$/.test(accent)) return "\\tilde";
    return null;
  };
  const tex = (g) => {
    const t = g.getAttribute("data-mml-node");
    const k = kids(g);
    switch (t) {
      case "mi": {
        const s = chars(g);
        return FUNCS.includes(s) ? "\\" + s + " " : s;
      }
      case "mn":
        return chars(g);
      case "mo": {
        /* tall brackets are drawn in pieces (⎛ ⎜ ⎝): one bracket each */
        const s = chars(g);
        if (/[\u239B-\u239D]/.test(s)) return "(";
        if (/[\u239E-\u23A0]/.test(s)) return ")";
        if (/[\u23A1-\u23A3]/.test(s)) return "[";
        if (/[\u23A4-\u23A6]/.test(s)) return "]";
        if (/[\u23A7-\u23A9]/.test(s)) return "\\{";
        if (/[\u23AB-\u23AD]/.test(s)) return "\\}";
        if (/^\u23AA+$|^\u23AE+$/.test(s)) return "";
        return s;
      }
      case "mtext": {
        const s = chars(g);
        return s.trim() ? "\\text{" + s + "}" : " ";
      }
      case "mspace":
        return "\\,";
      case "mfrac":
        return "\\frac{" + tex(k[0]) + "}{" + tex(k[1]) + "}";
      case "msqrt":
        /* the radical sign itself is drawn as an <mo>; only the radicand matters */
        return "\\sqrt{" + k.filter((c) => !(c.getAttribute("data-mml-node") === "mo" && /\u221A/.test(chars(c)))).map(tex).join("") + "}";
      case "mroot": {
        const parts = k.filter((c) => !(c.getAttribute("data-mml-node") === "mo" && /\u221A/.test(chars(c))));
        return "\\sqrt[" + tex(parts[1]) + "]{" + tex(parts[0]) + "}";
      }
      case "msup":
        return br(tex(k[0])) + "^" + br(tex(k[1]));
      case "msub":
        return br(tex(k[0])) + "_" + br(tex(k[1]));
      case "msubsup":
        return br(tex(k[0])) + "_" + br(tex(k[1])) + "^" + br(tex(k[2]));
      case "mover": {
        const acc = over(k[1]);
        return acc ? acc + "{" + tex(k[0]) + "}" : "\\overset{" + tex(k[1]) + "}{" + tex(k[0]) + "}";
      }
      case "munder":
        return br(tex(k[0])) + "_" + br(tex(k[1]));
      case "munderover":
        return br(tex(k[0])) + "_" + br(tex(k[1])) + "^" + br(tex(k[2]));
      case "mtable": {
        const rows = k.map((r) => kids(r).map((c) => tex(c)).join(" & "));
        const cols = Math.max(1, ...k.map((r) => kids(r).length));
        return "\\begin{array}{" + "c".repeat(cols) + "}" + rows.join(" \\\\ ") + "\\end{array}";
      }
      case "mphantom":
        return "";
      case "mpadded":
      case "mstyle":
      case "mrow":
      case "semantics":
      case "math":
      case "TeXAtom":
      case "mtd":
      case "mlabeledtr":
      default:
        return k.map(tex).join("");
    }
  };
  const svgToTex = (svg) => {
    const root = svg.querySelector('[data-mml-node="math"]');
    if (!root) return null;
    return tex(root)
      .replace(/\s+/g, " ")
      .replace(/\s*([{}^_])\s*/g, "$1")
      /* function names drawn letter by letter ("t","a","n") */
      .replace(/(^|[^\\a-zA-Z])(cosec|sin|cos|tan|cot|sec|csc|log|ln)(?![a-zA-Z])/g, "$1\\$2 ")
      .trim();
  };
  const cache = new Map();
  const mathOf = async (img) => {
    try {
      if (cache.has(img.src)) return cache.get(img.src);
      const text = await (await fetch(img.src)).text();
      const svg = new DOMParser().parseFromString(text, "image/svg+xml");
      const s = svgToTex(svg);
      cache.set(img.src, s);
      return s;
    } catch (e) {
      return null;
    }
  };

  /* An HTML block (stem, option, solution) -> Markdown with $LaTeX$ and image links. */
  const md = async (el) => {
    const out = [];
    const walk = async (n) => {
      if (n.nodeType === 3) return out.push(n.textContent.replace(/\s+/g, " "));
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === "img" && n.classList.contains("math-svg")) {
        const s = await mathOf(n);
        if (s) out.push(" $" + s + "$ ");
        else {
          out.push(" [MATH?] ");
          warn.push("Couldn't read a formula image: " + n.src.slice(0, 80));
        }
        return;
      }
      if (tag === "svg") {
        const s = svgToTex(n);
        if (s) out.push(" $" + s + "$ ");
        return;
      }
      if (tag === "img") return out.push("\n\n![](" + n.src + ")\n\n");
      if (tag === "br") return out.push("\n");
      const block = /^(p|div|li|tr|h\d)$/.test(tag);
      if (block) out.push("\n\n");
      for (const c of Array.from(n.childNodes)) await walk(c);
      if (block) out.push("\n\n");
    };
    await walk(el);
    return out
      .join("")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\$ \$/g, "$$ $$")
      .trim();
  };

  /* Open every "Written Solution" that isn't open yet (a second click would close it), then
     give each a moment to load. Same as the "Open all solutions" bookmarklet, built in. */
  const cardsNow = Array.from(document.querySelectorAll("div.p-5"));
  const closed = cardsNow
    .map((c) => Array.from(c.querySelectorAll("div")).find((d) => d.className.includes("bg-neutrals-100") && /Written Solution/.test(d.textContent)))
    .filter((box) => box && !box.querySelector(".html-renderer"))
    .map((box) => Array.from(box.querySelectorAll("div")).find((d) => /^\s*Written Solution\s*$/.test(d.textContent)))
    .filter(Boolean);
  for (const t of closed) {
    t.scrollIntoView({ block: "center" });
    t.click();
    await new Promise((r) => setTimeout(r, 700));
  }
  if (closed.length) await new Promise((r) => setTimeout(r, 1500));

  const header = document.body.innerText.match(/Chapter:\s*([^\n]+)[\s\S]*?Exercise:\s*([^\n]+)/);
  /* A question card: the bordered box whose first label reads "Q. 3/12" */
  const cards = Array.from(document.querySelectorAll("div.p-5")).filter(
    (d) => /^Q\.\s*\d+\s*\/\s*\d+$/.test((d.querySelector(".block")?.textContent || "").trim()) && d.querySelector(".html-renderer")
  );
  const questions = [];
  for (const card of cards) {
    const head = Array.from(card.querySelectorAll(".block")).map((b) => b.textContent.trim());
    const n = Number((head[0].match(/Q\.\s*(\d+)/) || [])[1]);
    const kind = (head[1] || "").toUpperCase();
    const difficulty = head[2] || "";
    const renderers = Array.from(card.querySelectorAll(".html-renderer"));
    const optionNodes = Array.from(card.querySelectorAll("#radioGroup > div, [id^=checkbox] > div"));
    const optionRenderers = new Set(optionNodes.map((o) => o.querySelector(".html-renderer")));
    const stemEl = renderers.find((r) => !optionRenderers.has(r));
    const solutionBox = Array.from(card.querySelectorAll("div")).find((d) => /^\s*Written Solution/.test(d.textContent) && d.className.includes("bg-neutrals-100"));
    const solEls = solutionBox ? Array.from(solutionBox.querySelectorAll(".html-renderer")) : [];

    let stem = stemEl ? await md(stemEl) : "";
    const tagMatch = stem.match(/\[RF\s*-\s*\d+\s*Times?\]\s*(\[[^\]]+\])?/i);
    const source = tagMatch && tagMatch[1] ? tagMatch[1].slice(1, -1).trim() : "";
    stem = stem.replace(/\*?\*?\[RF\s*-\s*\d+\s*Times?\][^\n]*/gi, "").trim();

    const letters = ["a", "b", "c", "d", "e"];
    const options = [];
    for (const o of optionNodes) options.push(await md(o.querySelector(".html-renderer") || o));
    const solution = solEls.length ? (await Promise.all(solEls.map(md))).join("\n\n") : "";

    /* The key. The site never marks it (not even with the solution open), so it is read
       from the solution, and keySource says how (the review screen flags the guesses):
       "stated"  - the solution says it ("Hence option (D)", "Ans. 3")
       "option"  - the solution's final expression is exactly one option
       "result"  - numerical: the last "= number" in the solution
       ""        - not found: Claude (or the teacher) has to solve it */
    const flat = (x) =>
      x
        .replace(/\\(text|mathrm)\{([^}]*)\}/g, "$2")
        .replace(/\\[,;! ]|\\left|\\right|\\quad|\$|&/g, "")
        .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/gi, (w) => String(["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"].indexOf(w.toLowerCase())))
        .replace(/\s+/g, "")
        .replace(/^\((.*)\)$/, "$1");
    let key = "";
    let keySource = "";
    const said = flat(solution).match(/(?:option|ans(?:wer)?|correct(?:answer|option)?)\.?[:\-]?\(?([A-Da-d])\)?(?![a-z])/i);
    if (said) [key, keySource] = [said[1].toLowerCase(), "stated"];
    const isNum = kind.includes("NUMERICAL") || !options.length;
    if (!key && !isNum && solution) {
      /* last few "= expression" steps of the solution vs the options */
      const tail = flat(solution).split(/=|\\\\|\\Rightarrow|\\therefore/).slice(-3).map((t) => t.replace(/\\end\{array\}.*$/, ""));
      const hits = options.map((o, i) => [i, flat(o)]).filter(([, o]) => o && tail.some((t) => t === o));
      if (hits.length === 1) [key, keySource] = [letters[hits[0][0]], "option"];
    }
    if (!key && isNum && solution) {
      const nums = flat(solution).match(/=\{?(-?\d+(?:\.\d+)?)\}?(?:\^\{?\\circ\}?)?(?![\d.]|\\frac|\^[^{\\])/g);
      if (nums) [key, keySource] = [nums[nums.length - 1].replace(/^=\{?|\}?(\^.*)?$/g, ""), "result"];
    }
    const type = kind.includes("NUMERICAL") || !options.length ? "NUMERICAL" : "MCQ";
    if (!key) warn.push("Q" + n + ": answer not found in the solution; needs solving");
    else if (keySource !== "stated") warn.push("Q" + n + ": answer " + key + " read from the end of the solution; check it");
    if (!solution) warn.push("Q" + n + ": no solution found (open the Written Solutions first)");

    const text = stem + (options.length ? "\n\n" + options.map((o, i) => "\\textbf{(" + letters[i] + ")} " + o.replace(/\n+/g, " ")).join("\n\n") : "");
    const keyLine = key ? (type === "MCQ" ? "(" + key + "\\)" : key) : "";
    questions.push({
      n,
      type,
      difficulty,
      source,
      kind: kind.toLowerCase(),
      text,
      ans: [keyLine, solution].filter(Boolean).join("\n\n"),
      answerKey: key,
      keySource,
      solution,
      images: (text + solution).match(/!\[\]\(([^)]+)\)/g)?.map((m) => m.slice(4, -1)) ?? [],
    });
  }

  const meta = { site: location.hostname, url: location.href, subject: header ? header[1].trim() : "", chapter: header ? header[2].replace(/Parts:.*/, "").trim() : document.title, exportedAt: new Date().toISOString(), count: questions.length, warnings: warn };
  const blob = new Blob([JSON.stringify({ format: "eplus-pyq-import/1", ...meta, questions }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = ((meta.chapter || "questions").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "questions") + ".json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 2000);
  alert("Downloaded " + questions.length + " questions." + (warn.length ? "\n\n" + warn.length + " warning(s), listed in the file." : ""));
})();
