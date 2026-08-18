/**
 * E2E Test Context & Environment Mock Factories
 * Provides test fixtures, mock Supabase database, mock Storage bucket, and mock Editor handles.
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Highlight } from '@tiptap/extension-highlight';

export interface TestChapter {
  id: string;
  project_id: string;
  number: number;
  title: string;
  content: string;
  status: 'Brouillon' | 'En cours' | 'Terminé';
  order_index: number;
  word_count: number;
  updated_at: string;
}

export interface TestProject {
  id: string;
  title: string;
  subtitle?: string;
  synopsis?: string;
  tone?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface RichManuscriptEditorHandle {
  getEditor: () => Editor | null;
  getContent: () => string;
  setContent: (content: string) => void;
  insertContent: (content: string) => void;
  replaceContent: (content: string) => void;
  focus: () => void;
}

/**
 * Creates a Tiptap Editor instance configured with standard Iris extensions
 */
export function createTestEditor(initialContent: string = ''): Editor {
  return new Editor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: initialContent,
  });
}

/**
 * Creates a mocked RichManuscriptEditorHandle wrapping a real Tiptap Editor
 */
export function createMockEditorHandle(initialContent: string = ''): {
  handle: RichManuscriptEditorHandle;
  editor: Editor;
  destroy: () => void;
} {
  const editor = createTestEditor(initialContent);

  const handle: RichManuscriptEditorHandle = {
    getEditor: () => editor,
    getContent: () => editor.getHTML(),
    setContent: (content: string) => {
      editor.commands.setContent(content, { emitUpdate: false });
    },
    insertContent: (content: string) => {
      editor.chain().focus().insertContent(content).run();
    },
    replaceContent: (newContent: string) => {
      editor.chain().focus().selectAll().insertContent(newContent).run();
    },
    focus: () => {
      editor.commands.focus();
    },
  };

  return {
    handle,
    editor,
    destroy: () => editor.destroy(),
  };
}

/**
 * In-Memory Mock Supabase Client
 */
export class MockSupabaseClient {
  public projects: Map<string, TestProject> = new Map();
  public chapters: Map<string, TestChapter> = new Map();
  public storageBuckets: Map<string, Map<string, { buffer: Buffer | Uint8Array; mimeType: string }>> = new Map();
  public aiUsageLogs: any[] = [];

  constructor() {
    this.storageBuckets.set('manuscripts', new Map());
    this.storageBuckets.set('images', new Map());
  }

  public seedProject(project: TestProject, chapters: TestChapter[] = []): void {
    this.projects.set(project.id, { ...project });
    for (const ch of chapters) {
      this.chapters.set(ch.id, { ...ch });
    }
  }

  public from(table: string) {
    const self = this;
    let selectedColumns = '*';
    let filterField: string | null = null;
    let filterValue: any = null;
    let orderField: string | null = null;
    let orderAscending = true;

    const builder = {
      select: (cols: string = '*') => {
        selectedColumns = cols;
        return builder;
      },
      eq: (field: string, val: any) => {
        filterField = field;
        filterValue = val;
        return builder;
      },
      order: (field: string, opts?: { ascending?: boolean }) => {
        orderField = field;
        orderAscending = opts?.ascending ?? true;
        return builder;
      },
      single: async () => {
        if (table === 'projects') {
          for (const p of self.projects.values()) {
            if (!filterField || (p as any)[filterField] === filterValue) {
              return { data: { ...p }, error: null };
            }
          }
          return { data: null, error: { message: 'Project not found' } };
        } else if (table === 'chapters') {
          for (const ch of self.chapters.values()) {
            if (!filterField || (ch as any)[filterField] === filterValue) {
              return { data: { ...ch }, error: null };
            }
          }
          return { data: null, error: { message: 'Chapter not found' } };
        } else if (table === 'profiles') {
          return { data: { id: filterValue || 'user-1', role: 'user', plan: 'pro' }, error: null };
        }
        return { data: null, error: { message: 'Unknown table' } };
      },
      insert: async (data: any) => {
        if (table === 'chapters') {
          const id = data.id || `chap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const newChap: TestChapter = {
            id,
            project_id: data.project_id,
            number: data.number || 1,
            title: data.title || 'Nouveau Chapitre',
            content: data.content || '',
            status: data.status || 'Brouillon',
            order_index: data.order_index ?? self.chapters.size,
            word_count: data.content ? data.content.trim().split(/\s+/).filter(Boolean).length : 0,
            updated_at: new Date().toISOString(),
          };
          self.chapters.set(id, newChap);
          return { data: newChap, error: null };
        } else if (table === 'projects') {
          const id = data.id || `proj-${Date.now()}`;
          const newProj: TestProject = {
            id,
            title: data.title || 'Mon Projet',
            subtitle: data.subtitle,
            synopsis: data.synopsis,
            tone: data.tone,
            category: data.category,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          self.projects.set(id, newProj);
          return { data: newProj, error: null };
        } else if (table === 'ai_usage') {
          self.aiUsageLogs.push({ ...data, timestamp: new Date().toISOString() });
          return { data, error: null };
        }
        return { data: null, error: { message: 'Insert failed' } };
      },
      update: (updateData: any) => {
        return {
          eq: (field: string, val: any) => {
            return {
              eq: (secondaryField: string, secondaryVal: any) => {
                return {
                  select: () => ({
                    single: async () => {
                      if (table === 'chapters') {
                        for (const [id, ch] of self.chapters.entries()) {
                          if (
                            (ch as any)[field] === val &&
                            (ch as any)[secondaryField] === secondaryVal
                          ) {
                            const updated = {
                              ...ch,
                              ...updateData,
                              updated_at: new Date().toISOString(),
                            };
                            self.chapters.set(id, updated);
                            return { data: updated, error: null };
                          }
                        }
                      }
                      return { data: null, error: { message: 'Item not found for update' } };
                    },
                  }),
                };
              },
              select: () => ({
                single: async () => {
                  if (table === 'projects') {
                    const p = self.projects.get(val);
                    if (p) {
                      const updated = { ...p, ...updateData, updated_at: new Date().toISOString() };
                      self.projects.set(val, updated);
                      return { data: updated, error: null };
                    }
                  } else if (table === 'chapters') {
                    const ch = self.chapters.get(val);
                    if (ch) {
                      const updated = { ...ch, ...updateData, updated_at: new Date().toISOString() };
                      self.chapters.set(val, updated);
                      return { data: updated, error: null };
                    }
                  }
                  return { data: null, error: { message: 'Item not found for update' } };
                },
              }),
            };
          },
        };
      },
      delete: () => {
        return {
          eq: async (field: string, val: any) => {
            if (table === 'chapters') {
              for (const [id, ch] of self.chapters.entries()) {
                if ((ch as any)[field] === val) {
                  self.chapters.delete(id);
                }
              }
              return { error: null };
            }
            return { error: null };
          },
        };
      },
    };

    return builder;
  }

  public storage = {
    from: (bucketName: string) => {
      const self = this;
      let bucket = self.storageBuckets.get(bucketName);
      if (!bucket) {
        bucket = new Map();
        self.storageBuckets.set(bucketName, bucket);
      }

      return {
        upload: async (
          filePath: string,
          fileBody: any,
          opts?: { contentType?: string; upsert?: boolean }
        ) => {
          if (!fileBody) {
            return { data: null, error: { message: 'Empty file body' } };
          }
          bucket!.set(filePath, {
            buffer: Buffer.isBuffer(fileBody) ? fileBody : Buffer.from(fileBody),
            mimeType: opts?.contentType || 'image/png',
          });
          return { data: { path: filePath }, error: null };
        },
        getPublicUrl: (filePath: string) => {
          return {
            data: {
              publicUrl: `https://mock-supabase.iris.app/storage/v1/object/public/${bucketName}/${filePath}`,
            },
          };
        },
        remove: async (paths: string[]) => {
          for (const p of paths) {
            bucket!.delete(p);
          }
          return { data: paths, error: null };
        },
        list: async () => {
          const files = Array.from(bucket!.keys()).map((name) => ({ name }));
          return { data: files, error: null };
        },
      };
    },
  };
}

/**
 * Storage Image Upload Utility simulating `uploadManuscriptImage`
 */
export async function mockUploadManuscriptImage(
  supabase: MockSupabaseClient,
  file: { name: string; type: string; size: number; content?: Buffer | string },
  projectId: string,
  bucketName: string = 'manuscripts'
): Promise<{ url: string; path: string; error?: string }> {
  if (!file || file.size === 0) {
    return { url: '', path: '', error: 'Fichier vide ou invalide' };
  }

  // Validate supported image MIME types
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return { url: '', path: '', error: 'Type de fichier non supporté. Formats acceptés : JPEG, PNG, WebP, GIF.' };
  }

  const cleanFileName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/gi, '_')
    .replace(/_+/g, '_');
  const path = `${projectId}/${Date.now()}_${cleanFileName}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file.content || Buffer.from('mock-image-data'), {
      contentType: file.type,
      upsert: false,
    });

  if (error || !data) {
    return { url: '', path: '', error: error?.message || "Erreur d'upload vers Supabase Storage" };
  }

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Simulates debounced autosave cycle
 */
export async function simulateDebouncedAutosave(
  supabase: MockSupabaseClient,
  projectId: string,
  chapterId: string,
  content: string,
  title: string,
  debounceMs: number = 1500
): Promise<{ success: boolean; savedChapter: TestChapter | null }> {
  // Simulate wait
  await new Promise((res) => setTimeout(res, 10));

  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const { data, error } = await (supabase
    .from('chapters')
    .update({ content, title, word_count: wordCount }) as any)
    .eq('id', chapterId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error || !data) {
    return { success: false, savedChapter: null };
  }

  // Update project updated_at
  await (supabase.from('projects').update({ updated_at: new Date().toISOString() }) as any)
    .eq('id', projectId);

  return { success: true, savedChapter: data };
}
