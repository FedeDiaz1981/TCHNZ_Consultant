import { chromium } from "playwright";
import { publicSiteUrl } from "../auth/public";

export type BlogEmailScreenshotInput = {
  summary: string | null;
  content: string;
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

function rewriteRelativeUrls(html: string) {
  const baseUrl = getSiteUrl();

  function toAbsoluteUrl(rawValue: string) {
    const value = rawValue.trim();
    if (!value || value.startsWith("//")) return value;
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(value)) return value;

    if (value.startsWith("/")) {
      const normalizedPath = value.startsWith("/consultant/") ? value : `/consultant${value}`;
      return new URL(normalizedPath, baseUrl).toString();
    }

    return value;
  }

  return html.replace(
    /(href|src)=["']([^"']*)["']/gi,
    (_match, attribute, value) => `${attribute}="${toAbsoluteUrl(value)}"`
  );
}

function buildSnapshotHtml(input: BlogEmailScreenshotInput) {
  const renderedContent = rewriteRelativeUrls(input.content);
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blog article preview</title>
    <style>
      :root {
        color-scheme: dark;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
        color: #fff;
        font-family: Inter, Arial, sans-serif;
      }

      .snapshot-wrap {
        width: 100%;
        min-height: 100vh;
        padding: 0;
        box-sizing: border-box;
      }

      .portal-panel {
        width: 100%;
        max-width: 1180px;
        margin: 0 auto;
        border-radius: 32px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
        box-shadow: none;
        padding: 24px;
        box-sizing: border-box;
      }

      .portal-blog-article {
        display: grid;
        gap: 0;
        width: 100%;
        max-width: 100%;
        min-width: 0;
      }

      .portal-blog-article__content {
        width: 100%;
        max-width: 100%;
        padding: 1.1rem;
        border-radius: 2rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.88);
        font-size: 1rem;
        line-height: 1.9;
        overflow: visible;
        box-sizing: border-box;
        min-width: 0;
      }

      .portal-blog-article__content :is(p) {
        margin: 0 0 0.9rem;
      }

      .portal-blog-article__content :is(ul, ol) {
        margin: 0 0 0.9rem;
        padding-left: 1.25rem;
      }

      .portal-blog-article__content img {
        max-width: 100%;
        height: auto;
        border-radius: 0.8rem;
        display: block;
        margin: 1rem 0;
      }

      .portal-blog-article__content .portal-rich-content {
        position: relative;
        min-height: 460px;
        padding-bottom: 0.1rem;
        display: flow-root;
      }

      .portal-blog-article__content .editor-image {
        display: block;
        width: fit-content;
        max-width: 100%;
        margin: 0.9rem auto 1.8rem;
        clear: both;
      }

      .portal-blog-article__content .editor-image img {
        margin: 0;
      }

      .portal-blog-article__content .editor-image.is-left {
        float: left;
        width: 42%;
        margin: 0.8rem 1rem 1.6rem 0;
        clear: none;
      }

      .portal-blog-article__content .editor-image.is-right {
        float: right;
        width: 42%;
        margin: 0.8rem 0 1.6rem 1rem;
        clear: none;
      }

      .portal-blog-article__content .editor-image.is-center {
        float: none;
        margin: 0.9rem auto 1.8rem;
        clear: both;
      }

      .portal-blog-article__content .editor-image.is-free {
        float: none;
        clear: both;
        margin-top: 0.9rem;
        margin-bottom: 1.8rem;
        margin-right: 0;
        margin-left: 0;
      }

      .portal-blog-article__content .editor-layout-block {
        position: absolute;
        border: 0;
        border-radius: 0.75rem;
        background: transparent;
        box-shadow: none;
        padding: 0.55rem;
        min-width: 90px;
        min-height: 48px;
        z-index: 2;
        margin-bottom: 1.8rem;
      }

      .portal-blog-article__content .editor-layout-block__text {
        min-height: 100%;
        color: inherit;
      }

      .portal-blog-article__content .editor-layout-block__resize {
        display: none;
      }

      @media (max-width: 768px) {
        .snapshot-wrap {
          padding: 0;
        }

        .portal-panel {
          padding: 18px;
          border-radius: 24px;
        }

        .portal-blog-article__content {
          padding: 0.9rem;
        }
      }
      </style>
  </head>
  <body>
    <div class="snapshot-wrap">
      <section class="portal-panel">
        <article class="portal-blog-article">
          <div class="portal-blog-article__content">
            <div class="portal-rich-content">${renderedContent}</div>
          </div>
        </article>
      </section>
    </div>
    <script>
      (() => {
        const contentRoot = document.querySelector(".portal-rich-content");
        if (!(contentRoot instanceof HTMLElement)) return;

        const normalizeImages = () => {
          const figures = Array.from(contentRoot.querySelectorAll(".editor-image"));
          const flowBlocks = Array.from(contentRoot.querySelectorAll("p, ul, ol, .editor-layout-block"));

          const intersects = (firstRect, secondRect, padding = 0) => {
            return !(
              firstRect.right + padding <= secondRect.left ||
              firstRect.left - padding >= secondRect.right ||
              firstRect.bottom + padding <= secondRect.top ||
              firstRect.top - padding >= secondRect.bottom
            );
          };

          figures.forEach((figureNode) => {
            if (!(figureNode instanceof HTMLElement)) return;

            const imageNode = figureNode.querySelector("img");
            const isSideFloat = figureNode.classList.contains("is-left") || figureNode.classList.contains("is-right");
            if (!isSideFloat || !(imageNode instanceof HTMLImageElement)) return;

            const paragraphNodes = Array.from(contentRoot.querySelectorAll("p, ul, ol"));
            const imageRect = figureNode.getBoundingClientRect();
            const textWidth = contentRoot.clientWidth || 800;
            const expectedFloatWidth = Math.max(240, Math.round(textWidth * 0.42));
            const hasTextOverlap = paragraphNodes.some((blockNode) => {
              if (!(blockNode instanceof HTMLElement)) return false;
              const range = document.createRange();
              range.selectNodeContents(blockNode);
              const textRects = Array.from(range.getClientRects());
              return textRects.some((textRect) => intersects(imageRect, textRect, 4));
            });

            const figureIndex = flowBlocks.indexOf(figureNode);
            const nextBlock = figureIndex >= 0 ? flowBlocks.slice(figureIndex + 1).find((node) => node instanceof HTMLElement) : null;
            const shouldClearNextBlock =
              !!nextBlock &&
              nextBlock instanceof HTMLElement &&
              nextBlock.getBoundingClientRect().top < imageRect.bottom + 24;

            if (hasTextOverlap || shouldClearNextBlock) {
              figureNode.style.float = "none";
              figureNode.style.clear = "both";
              figureNode.style.display = "block";
              figureNode.style.width = "100%";
              figureNode.style.margin = "0.9rem 0 1.3rem";
              imageNode.style.width = "100%";
              imageNode.style.height = "auto";
              if (nextBlock instanceof HTMLElement) {
                nextBlock.style.clear = "both";
                nextBlock.style.marginTop = "1rem";
              }
              return;
            }

            figureNode.style.maxWidth = expectedFloatWidth + "px";
            imageNode.style.width = "100%";
            imageNode.style.height = "auto";
          });
        };

        const applyRichContentHeight = () => {
          contentRoot.style.height = "auto";

          let maxBottom = 0;
          contentRoot.querySelectorAll(".editor-layout-block").forEach((blockNode) => {
            if (!(blockNode instanceof HTMLElement)) return;
            const top = blockNode.offsetTop;
            const bottom = top + blockNode.offsetHeight;
            if (bottom > maxBottom) maxBottom = bottom;
          });

          const naturalHeight = contentRoot.scrollHeight;
          const finalHeight = Math.max(naturalHeight, maxBottom + 8);
          contentRoot.style.minHeight = finalHeight + "px";
        };

        normalizeImages();
        applyRichContentHeight();
        window.addEventListener("load", applyRichContentHeight);
        window.addEventListener("resize", applyRichContentHeight);
      })();
    </script>
  </body>
</html>`;
}

export async function renderBlogEmailScreenshot(input: BlogEmailScreenshotInput) {
  const browser = await chromium.launch({
    headless: true,
    args: process.platform === "linux" ? ["--no-sandbox", "--disable-dev-shm-usage"] : []
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 2200 },
      deviceScaleFactor: 1
    });

    await page.setContent(buildSnapshotHtml(input), { waitUntil: "load" });
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map(async (image) => {
          if (image.complete) return;
          await new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
        })
      );
    });
    await page.waitForTimeout(600);

    const panel = await page.$(".portal-panel");
    const box = panel ? await panel.boundingBox() : null;

    if (!box) {
      return await page.screenshot({
        type: "png",
        fullPage: true,
        omitBackground: true
      });
    }

    return await page.screenshot({
      type: "png",
      clip: {
        x: Math.max(0, Math.floor(box.x)),
        y: Math.max(0, Math.floor(box.y)),
        width: Math.ceil(box.width),
        height: Math.ceil(box.height)
      },
      omitBackground: true
    });
  } finally {
    await browser.close();
  }
}
