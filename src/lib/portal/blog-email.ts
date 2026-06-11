import nodemailer from "nodemailer";
import { parseFragment, serialize } from "parse5";
import { publicSiteUrl } from "../auth/public";
import { buildPublicSiteUrl } from "../auth/public";
import { renderBlogEmailScreenshot } from "./blog-email-screenshot";

export type BlogDistributionEmail = {
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  coverImageUrl: string | null;
  authorName: string;
  tags: string[];
  referenceLinks: string[];
  publishedAt: string | null;
  portalLabel: string;
  portalDescription: string;
};

type SendBlogDistributionEmailInput = BlogDistributionEmail & {
  recipients: string[];
  moduleName: string;
};

function getSiteUrl() {
  if (!publicSiteUrl) {
    throw new Error("Missing PUBLIC_SITE_URL environment variable.");
  }

  return new URL(publicSiteUrl);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rewriteRelativeUrls(html: string) {
  const baseUrl = getSiteUrl();

  function toAbsoluteUrl(rawValue: string) {
    const value = rawValue.trim();
    if (!value || value.startsWith("//")) return value;
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(value)) return value;

    if (value.startsWith("/")) {
      const normalizedPath = value.startsWith("/consultant/")
        ? value
        : `/consultant${value}`;

      return new URL(normalizedPath, baseUrl).toString();
    }

    return value;
  }

  return html.replace(
    /(href|src)=["']([^"']*)["']/gi,
    (_match, attribute, value) => `${attribute}="${toAbsoluteUrl(value)}"`
  );
}

function getNodeAttribute(node: any, attributeName: string) {
  return (node.attrs ?? []).find((attribute: { name: string; value: string }) => attribute.name === attributeName)?.value ?? "";
}

function setNodeAttribute(node: any, attributeName: string, value: string) {
  const attrs = Array.isArray(node.attrs) ? node.attrs : [];
  const existingIndex = attrs.findIndex((attribute: { name: string; value: string }) => attribute.name === attributeName);
  const nextAttribute = { name: attributeName, value };
  if (existingIndex >= 0) {
    attrs[existingIndex] = nextAttribute;
  } else {
    attrs.push(nextAttribute);
  }
  node.attrs = attrs;
}

function nodeToHtml(node: any) {
  return serialize({ childNodes: [node] } as any);
}

function isElementNode(node: any, tagName: string) {
  return node?.nodeName === tagName;
}

function hasEditorImageClass(node: any) {
  return /\beditor-image\b/i.test(getNodeAttribute(node, "class"));
}

function getEditorImagePosition(node: any) {
  const className = getNodeAttribute(node, "class");
  if (/\bis-right\b/i.test(className)) return "right";
  if (/\bis-left\b/i.test(className)) return "left";
  return "center";
}

function inlineEditorStyles(html: string) {
  return html
    .replace(
      /<figure\b([^>]*)class="([^"]*\beditor-image\b[^"]*)"([^>]*)>/gi,
      (_match, before, className, after) => {
        const classes = className.split(/\s+/);
        const baseStyles = [
          "display:block",
          "max-width:100%",
          "margin:0.9rem auto",
          "clear:both"
        ];

        if (classes.includes("is-left")) {
          baseStyles.push("float:left", "margin:0.8rem 1rem 0.8rem 0", "clear:none");
        } else if (classes.includes("is-right")) {
          baseStyles.push("float:right", "margin:0.8rem 0 0.8rem 1rem", "clear:none");
        } else if (classes.includes("is-free")) {
          baseStyles.push(
            "float:none",
            "clear:both",
            "margin-top:0.9rem",
            "margin-bottom:0.9rem",
            "margin-right:0",
            "margin-left:0"
          );
        } else if (classes.includes("is-center")) {
          baseStyles.push("float:none", "margin:0.9rem auto", "clear:both");
        }

        return `<figure${before}class="${className}"${after} style="${baseStyles.join(";")}">`;
      }
    )
    .replace(
      /<div\b([^>]*)class="([^"]*\beditor-layout-block\b[^"]*)"([^>]*)>/gi,
      (_match, before, className, after) =>
        `<div${before}class="${className}"${after} style="position:absolute;border:0;border-radius:.75rem;background:transparent;box-shadow:none;padding:.55rem;min-width:90px;min-height:48px;z-index:2;">`
    )
    .replace(
      /<div\b([^>]*)class="([^"]*\beditor-layout-block__text\b[^"]*)"([^>]*)>/gi,
      (_match, before, className, after) =>
        `<div${before}class="${className}"${after} style="min-height:100%;color:inherit;">`
    )
    .replace(
      /<img\b([^>]*?)>/gi,
      (match, attrs) => {
        if (/style=/i.test(attrs)) return match;

        const styles = [
          "max-width:100%",
          "height:auto",
          "border-radius:.8rem",
          "display:block",
          "margin:1rem 0"
        ];

        return `<img${attrs} style="${styles.join(";")}">`;
      }
    );
}

function buildEmailContentHtml(html: string) {
  const fragment = parseFragment(html) as any;
  const nodes = fragment.childNodes ?? [];
  const output: string[] = [];

  function isWhitespaceOnlyNode(node: any) {
    return node?.nodeName === "#text" && !String(node.value ?? "").trim();
  }

  function hasClass(node: any, className: string) {
    return new RegExp(`(^|\\s)${className}(\\s|$)`).test(getNodeAttribute(node, "class"));
  }

  function isSideImageFigure(node: any) {
    return isElementNode(node, "figure") && hasEditorImageClass(node) && getEditorImagePosition(node) !== "center";
  }

  function isCenteredImageFigure(node: any) {
    return isElementNode(node, "figure") && hasEditorImageClass(node) && getEditorImagePosition(node) === "center";
  }

  function isLayoutBlock(node: any) {
    return isElementNode(node, "div") && hasClass(node, "editor-layout-block");
  }

  function normalizeImageNode(node: any) {
    if (isElementNode(node, "img")) {
      setNodeAttribute(
        node,
        "style",
        `${getNodeAttribute(node, "style")};max-width:100%;height:auto;display:block;border-radius:.8rem;margin:0;`
      );
      return;
    }

    for (const child of node.childNodes ?? []) {
      normalizeImageNode(child);
    }
  }

  function normalizeFigureNode(node: any) {
    const position = getEditorImagePosition(node);
    const currentStyle = getNodeAttribute(node, "style");
    const styles = [
      "display:block",
      "max-width:100%",
      "margin:0.9rem auto",
      "clear:both"
    ];

    if (position === "left") {
      styles.push("float:left", "margin:0.8rem 1rem 0.8rem 0", "clear:none");
    } else if (position === "right") {
      styles.push("float:right", "margin:0.8rem 0 0.8rem 1rem", "clear:none");
    } else if (hasClass(node, "is-free")) {
      styles.push("float:none", "clear:both", "margin:0.9rem 0");
    }

    if (currentStyle) {
      styles.push(currentStyle);
    }

    setNodeAttribute(node, "style", styles.join(";"));
    normalizeImageNode(node);
    return nodeToHtml(node);
  }

  function normalizeLayoutBlockNode(node: any) {
    const currentStyle = getNodeAttribute(node, "style");
    const styles = [
      "position:static",
      "display:block",
      "width:100%",
      "height:auto",
      "min-height:0",
      "border:0",
      "border-radius:0.75rem",
      "background:transparent",
      "box-shadow:none",
      "padding:0",
      "margin:0.9rem 0"
    ];

    if (currentStyle) {
      styles.push(currentStyle);
    }

    setNodeAttribute(node, "style", styles.join(";"));
    return nodeToHtml(node);
  }

  function renderTextNodes(list: any[]) {
    const textHtml = list.map((node) => nodeToHtml(node)).join("").trim();
    if (!textHtml) return "";
    return `<div style="margin:0 0 1rem 0;line-height:1.9;">${textHtml}</div>`;
  }

  function consumeTextRun(startIndex: number) {
    const collected: any[] = [];
    let nextIndex = startIndex;

    while (nextIndex < nodes.length) {
      const currentNode = nodes[nextIndex];
      if (isWhitespaceOnlyNode(currentNode)) {
        nextIndex += 1;
        continue;
      }

      if (isSideImageFigure(currentNode) || isCenteredImageFigure(currentNode) || isLayoutBlock(currentNode)) {
        break;
      }

      collected.push(currentNode);
      nextIndex += 1;
    }

    return {
      html: renderTextNodes(collected),
      nextIndex
    };
  }

  function renderSideImagePair(imageIndex: number, textStartIndex: number) {
    const imageNode = nodes[imageIndex];
    const imageHtml = normalizeFigureNode(imageNode);
    const imagePosition = getEditorImagePosition(imageNode);

    const textRun = consumeTextRun(textStartIndex);
    const textHtml = textRun.html;

    if (!textHtml) {
      return {
        html: `<div style="margin:1rem 0;">${imageHtml}</div>`,
        nextIndex: imageIndex + 1
      };
    }

    const textCell = `<td valign="top" style="vertical-align:top;width:60%;padding:0;">${textHtml}</td>`;
    const imageCell = `<td valign="top" style="vertical-align:top;width:40%;padding:0;">${imageHtml}</td>`;
    const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:1rem 0;"><tr>${
      imagePosition === "right" ? `${textCell}${imageCell}` : `${imageCell}${textCell}`
    }</tr></table>`;

    return {
      html,
      nextIndex: textRun.nextIndex
    };
  }

  let index = 0;
  while (index < nodes.length) {
    const node = nodes[index];

    if (isWhitespaceOnlyNode(node)) {
      index += 1;
      continue;
    }

    if (isCenteredImageFigure(node)) {
      output.push(
        `<div style="margin:1rem 0;text-align:center;">${normalizeFigureNode(node)}</div>`
      );
      index += 1;
      continue;
    }

    if (isSideImageFigure(node)) {
      const nextTextPair = renderSideImagePair(index, index + 1);
      if (nextTextPair.html) {
        output.push(nextTextPair.html);
        index = nextTextPair.nextIndex;
        continue;
      }

      output.push(`<div style="margin:1rem 0;">${normalizeFigureNode(node)}</div>`);
      index += 1;
      continue;
    }

    if (isLayoutBlock(node)) {
      output.push(normalizeLayoutBlockNode(node));
      index += 1;
      continue;
    }

    const textRun = consumeTextRun(index);
    if (textRun.html) {
      const nextNode = nodes[textRun.nextIndex];
      if (isSideImageFigure(nextNode)) {
        const pair = renderSideImagePair(textRun.nextIndex, textRun.nextIndex + 1);
        output.push(pair.html);
        index = pair.nextIndex;
        continue;
      }

      output.push(textRun.html);
      index = textRun.nextIndex;
      continue;
    }

    output.push(nodeToHtml(node));
    index += 1;
  }

  return output.join("");
}

function getSmtpConfig() {
  const smtpUrl = import.meta.env.SMTP_URL?.trim();
  if (smtpUrl) {
    const fromName = import.meta.env.SMTP_FROM_NAME?.trim();
    const fromEmail = import.meta.env.SMTP_FROM?.trim() || import.meta.env.SMTP_USER?.trim();
    return {
      transport: { url: smtpUrl },
      from: fromName && fromEmail ? `${fromName} <${fromEmail}>` : fromEmail || "Technized <no-reply@technized.com>",
      replyTo: import.meta.env.SMTP_REPLY_TO?.trim() || import.meta.env.SMTP_USER?.trim()
    };
  }

  const host = import.meta.env.SMTP_HOST?.trim();
  const port = Number(import.meta.env.SMTP_PORT ?? 587);
  const user = import.meta.env.SMTP_USER?.trim();
  const password = import.meta.env.SMTP_PASSWORD?.trim();
  const secure = String(import.meta.env.SMTP_SECURE ?? "").trim().toLowerCase() === "true";
  const fromName = import.meta.env.SMTP_FROM_NAME?.trim();
  const fromEmail = import.meta.env.SMTP_FROM?.trim() || user;
  const replyTo = import.meta.env.SMTP_REPLY_TO?.trim() || user;

  if (!host || !user || !password || !fromEmail) {
    return null;
  }

  return {
    transport: {
      host,
      port,
      secure,
      auth: {
        user,
        pass: password
      }
    },
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
    replyTo
  };
}

export function normalizeDistributionEmails(value: string) {
  return value
    .split(/[\r\n,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item, index, list) => Boolean(item) && list.indexOf(item) === index);
}

export function buildBlogDistributionEmailHtml(input: BlogDistributionEmail) {
  const renderedContent = buildEmailContentHtml(inlineEditorStyles(rewriteRelativeUrls(input.content)));
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background:
          radial-gradient(circle at top right, rgba(239, 124, 14, 0.14), transparent 28%),
          radial-gradient(circle at bottom left, rgba(118, 54, 140, 0.18), transparent 32%),
          linear-gradient(180deg, #120d18 0%, #0f0b16 100%);
        color: #fff;
        font-family: Inter, Arial, sans-serif;
      }

      .shell {
        width: 100%;
        padding: 28px 12px;
      }

      .card {
        max-width: 900px;
        margin: 0 auto;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 28px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.04);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
      }

      .content {
        padding: 28px;
        color: rgba(255, 255, 255, 0.88);
        font-size: 16px;
        line-height: 1.9;
      }

      .portal-rich-content {
        position: relative;
        min-height: 460px;
        padding-bottom: 1.25rem;
      }

      .portal-rich-content *,
      .portal-rich-content *::before,
      .portal-rich-content *::after {
        box-sizing: border-box;
      }

      .portal-rich-content p {
        margin: 0 0 0.9rem;
      }

      .portal-rich-content ul,
      .portal-rich-content ol {
        margin: 0 0 0.9rem;
        padding-left: 1.25rem;
      }

      .portal-rich-content img {
        max-width: 100%;
        height: auto;
        border-radius: 0.8rem;
        display: block;
        margin: 1rem 0;
      }

      .portal-rich-content table {
        border-collapse: collapse;
      }

      .portal-rich-content a {
        color: #ffb979;
      }

      .editor-image {
        display: block;
        width: fit-content;
        max-width: 100%;
        margin: 0.9rem auto;
        clear: both;
      }

      .editor-image img {
        margin: 0;
      }

      .editor-image.is-left {
        float: left;
        margin: 0.8rem 1rem 0.8rem 0;
        clear: none;
      }

      .editor-image.is-right {
        float: right;
        margin: 0.8rem 0 0.8rem 1rem;
        clear: none;
      }

      .editor-image.is-center {
        float: none;
        margin: 0.9rem auto;
        clear: both;
      }

      .editor-image.is-free {
        float: none;
        clear: both;
        margin-top: 0.9rem;
        margin-bottom: 0.9rem;
        margin-right: 0;
        margin-left: 0;
      }

      .editor-layout-block {
        position: static;
        border: 0;
        border-radius: 0.75rem;
        background: transparent;
        box-shadow: none;
        padding: 0.55rem;
        min-width: 0;
        min-height: 0;
        z-index: 1;
      }

      .editor-layout-block__text {
        min-height: 100%;
        color: inherit;
      }

      .editor-layout-block__resize {
        display: none;
      }

      .portal-rich-content span {
        background: transparent !important;
        color: inherit !important;
      }

      @media (max-width: 640px) {
        .content {
          padding: 20px;
        }

        .portal-rich-content table,
        .portal-rich-content tr,
        .portal-rich-content td {
          display: block;
          width: 100% !important;
        }

        .portal-rich-content td {
          padding: 0 !important;
        }

        .portal-rich-content img {
          width: 100% !important;
          height: auto !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:radial-gradient(circle at top right, rgba(239, 124, 14, 0.14), transparent 28%), radial-gradient(circle at bottom left, rgba(118, 54, 140, 0.18), transparent 32%), linear-gradient(180deg, #120d18 0%, #0f0b16 100%);color:#fff;font-family:Inter, Arial, sans-serif;">
    <div class="shell" style="width:100%;padding:28px 12px;">
      <div class="card" style="max-width:900px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;background:rgba(255,255,255,0.04);box-shadow:0 24px 60px rgba(0,0,0,0.28);">
        <div class="content" style="padding:28px;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.9;">
          <div class="portal-rich-content" style="position:relative;min-height:460px;padding-bottom:1.25rem;">
            ${renderedContent}
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendBlogDistributionEmail(input: SendBlogDistributionEmailInput) {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("Falta configurar SMTP para enviar emails de training.");
  }

  if (input.recipients.length === 0) {
    throw new Error("La lista de distribucion no contiene destinatarios validos.");
  }

  const transport = nodemailer.createTransport(config.transport);
  const subject = `[${input.moduleName}] ${input.title}`;
  const screenshotContent = await renderBlogEmailScreenshot({
    summary: input.summary,
    content: input.content
  });

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px 12px;background:transparent;font-family:Inter, Arial, sans-serif;color:#111;">
    <div style="max-width:1180px;margin:0 auto;">
      <div style="border:1px solid rgba(255,255,255,.08);border-radius:28px;overflow:hidden;background:#1b1622;box-shadow:0 24px 60px rgba(0,0,0,.28);padding:0;">
        <img src="cid:blog-article-screenshot" alt="${escapeHtml(input.title)}" style="display:block;width:100%;height:auto;border:0;" />
      </div>
      <p style="margin:16px 4px 0;color:rgba(0,0,0,.7);font-size:14px;line-height:1.6;">
        Ver online:
        <a href="${buildPublicSiteUrl(`/clientes/blog/${input.slug}`).toString()}" style="color:#ffb979;">${buildPublicSiteUrl(`/clientes/blog/${input.slug}`).toString()}</a>
      </p>
    </div>
  </body>
</html>`;

  return transport.sendMail({
    from: config.from,
    replyTo: config.replyTo,
    to: input.recipients.join(", "),
    subject,
    html,
    attachments: screenshotContent
      ? [
          {
            filename: "article.png",
            content: screenshotContent,
            cid: "blog-article-screenshot"
          }
        ]
      : undefined,
    text: `${input.title}\n\n${stripHtml(input.summary ?? input.content)}\n\n${buildPublicSiteUrl(`/clientes/blog/${input.slug}`).toString()}`
  });
}
