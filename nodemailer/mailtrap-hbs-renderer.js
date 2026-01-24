// mailtrap-hbs-renderer.js
const fs = require("fs").promises;
const path = require("path");
const Handlebars = require("handlebars");

// In CommonJS, __dirname werkt gewoon
const templatesDir = path.join(__dirname, "templates");

// Cache compiled templates for performance
const templateCache = new Map();

// Optional: register partials once at startup
let partialsRegistered = false;

async function registerPartialsOnce() {
  if (partialsRegistered) return;

  const files = await fs.readdir(templatesDir);

  await Promise.all(
      files
      .filter((f) => f.endsWith(".handlebars"))
      .map(async (file) => {
        const name = path.basename(file, ".handlebars");
        const content = await fs.readFile(path.join(templatesDir, file), "utf8");
        Handlebars.registerPartial(name, content);
      })
  );

  partialsRegistered = true;
}

async function renderTemplate(templateName, context) {
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

module.exports = {
  renderTemplate,
};
