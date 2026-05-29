import { promises as fs } from 'fs';
import path from 'path';

/**
 * Reads the orientation document and returns its content.
 * @returns {Promise<string>} The content of the orientation document.
 */
export async function readOrientationDocument(): Promise<string> {
  const filePath = path.join(__dirname, '../docs/AGENTS.md');
  return fs.readFile(filePath, 'utf-8');
}