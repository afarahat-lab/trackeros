export enum NoteStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export interface Note {
  id: string;
  title: string;
  body: string;
  status: NoteStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteDto {
  title: string;
  body: string;
}
