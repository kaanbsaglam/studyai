/**
 * Prompt Loader
 *
 * Reads .md prompt files from the prompts directory, caches them,
 * and supports variable interpolation and basic conditionals.
 *
 * Usage:
 *   const { loadPrompt } = require('./prompts/loader');
 *   const prompt = loadPrompt('chat/system', { question: 'What is DNA?' });
 */

const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = __dirname;
const cache = new Map();

/**
 * Load and render a prompt template.
 *
 * @param {string} name - Prompt path relative to prompts/, without extension (e.g. 'chat/system')
 * @param {object} [vars={}] - Variables for interpolation
 * @returns {string} Rendered prompt
 */
function loadPrompt(name, vars = {}) {
  const template = getTemplate(name);
  return render(template, vars);
}

/**
 * Read and cache a prompt template file.
 */
function getTemplate(name) {
  if (cache.has(name)) {
    return cache.get(name);
  }

  const filePath = path.join(PROMPTS_DIR, `${name}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt template not found: ${name} (looked at ${filePath})`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  cache.set(name, content);
  return content;
}

/**
 * Render a template string with variable interpolation and conditionals.
 *
 * Supports:
 *   {{varName}}           - Variable substitution
 *   {{#if varName}}...{{/if}}          - Conditional block (truthy check)
 *   {{#if varName}}...{{else}}...{{/if}} - If/else block
 *
 * @param {string} template
 * @param {object} vars
 * @returns {string}
 */
function render(template, vars) {
  // Process conditionals first (supports nesting by processing innermost first)
  let result = template;

  // Iteratively process conditionals from innermost to outermost
  const IF_REGEX = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/;
  let safety = 0;
  while (IF_REGEX.test(result) && safety++ < 50) {
    result = result.replace(IF_REGEX, (_, varName, body) => {
      const value = vars[varName];
      const isTruthy = value !== undefined && value !== null && value !== false && value !== '';

      // Check for else clause
      const elseParts = body.split('{{else}}');
      if (elseParts.length === 2) {
        return isTruthy ? elseParts[0] : elseParts[1];
      }
      return isTruthy ? body : '';
    });
  }

  // Interpolate variables
  result = result.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    const value = vars[varName];
    if (value === undefined || value === null) return '';
    return String(value);
  });

  // Clean up: collapse 3+ consecutive newlines into 2
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

/**
 * Clear the template cache (useful for testing).
 */
function clearCache() {
  cache.clear();
}

module.exports = { loadPrompt, clearCache };
