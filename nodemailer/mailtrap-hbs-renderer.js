// mailtrap-hbs-renderer.js
import fs from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";

const templatesDir = path.resolve("./nodemailer/templates/");

// Cache compiled templates for performance
const templateCache = new Map();

// Optional: register partials once at startup
let partialsRegistered = false;

async function registerPartialsOnce() {
  if (partialsRegistered) return;

  // Load all *.hbs files in templatesDir as partials too (common pattern)
  // If you have a dedicated partials folder, point to it instead.
  const files = await fs.readdir(templatesDir);
  await Promise.all(
      files
      .filter((f) => f.endsWith(".hbs"))
      .map(async (file) => {
        const name = path.basename(file, ".hbs");
        const content = await fs.readFile(path.join(templatesDir, file), "utf8");
        Handlebars.registerPartial(name, content);
      })
  );

  partialsRegistered = true;
}

export async function renderTemplate(templateName, context) {
  await registerPartialsOnce();

  let compiled = templateCache.get(templateName);

  if (!compiled) {
    const templatePath = path.join(templatesDir, `${templateName}.handlebars`);
    const source = await fs.readFile(templatePath, "utf8");
    compiled = Handlebars.compile(source, { strict: true });
    templateCache.set(templateName, compiled);
  }

  return compiled(context);
}
