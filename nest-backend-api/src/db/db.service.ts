import { Inject, Injectable } from '@nestjs/common';
import type { DbModuleOptions } from './db.module';
import { writeFile } from 'fs/promises';
import { readFile, access } from 'fs/promises';

@Injectable()
export class DbService {
  // @Inject('OPTIONS')
  // private options: DbModuleOptions;
  // OR
  constructor(@Inject('OPTIONS') private options: DbModuleOptions) {}

  async write(obj: Record<string, any>) {
    await writeFile(this.options.path, JSON.stringify(obj || []), {
      encoding: 'utf-8',
    });
  }

  async read(): Promise<any> {
    const filePath = this.options.path;
    try {
      await access(filePath);
      const data = await readFile(filePath, { encoding: 'utf-8' });
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
}
