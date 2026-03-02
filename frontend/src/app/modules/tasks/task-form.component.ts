import { Component, inject, signal, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TaskService } from '../../core/services/task.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    InputTextModule,
    Textarea,
    Select,
    DatePicker,
    ButtonModule,
    InputNumberModule
  ],
  template: `
    <p-dialog [header]="'New Task'" [(visible)]="visible" [modal]="true"
      [style]="{width:'560px'}" [draggable]="false" (onHide)="onCancel()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="field">
          <label>Title *</label>
          <input pInputText formControlName="title" class="w-full" placeholder="Task title" />
        </div>

        <div class="grid">
          <div class="col-6 field">
            <label>Type</label>
            <p-select formControlName="taskType" [options]="taskTypes"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div class="col-6 field">
            <label>Priority</label>
            <p-select formControlName="priority" [options]="priorities"
              optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>

        <div class="grid">
          <div class="col-6 field">
            <label>Due Date</label>
            <p-datepicker formControlName="dueDate" styleClass="w-full" dateFormat="yy-mm-dd" />
          </div>
          <div class="col-6 field">
            <label>Story Points</label>
            <p-inputNumber formControlName="storyPoints" [min]="0" [max]="100" styleClass="w-full" />
          </div>
        </div>

        <div class="field">
          <label>Description</label>
          <textarea pTextarea formControlName="description" class="w-full" rows="4"
            placeholder="Describe the task…"></textarea>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" />
        <p-button label="Create Task" icon="pi pi-plus" (onClick)="onSubmit()"
          [loading]="saving()" [disabled]="form.invalid || saving()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .field { margin-bottom: 1rem; }
    .field label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--text-color-secondary); }
  `]
})
export class TaskFormComponent {
  @Input() visible = false;
  @Input() projectId!: number;
  @Output() taskCreated = new EventEmitter<any>();
  @Output() visibleChange = new EventEmitter<boolean>();

  private taskSvc = inject(TaskService);
  private fb = inject(FormBuilder);

  saving = signal(false);

  taskTypes = [
    { label: 'Task', value: 'TASK' },
    { label: 'Story', value: 'STORY' },
    { label: 'Bug', value: 'BUG' },
    { label: 'Epic', value: 'EPIC' }
  ];

  priorities = [
    { label: 'Critical', value: 'CRITICAL' },
    { label: 'High', value: 'HIGH' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Low', value: 'LOW' }
  ];

  form = this.fb.group({
    title: ['', Validators.required],
    taskType: ['TASK'],
    priority: ['MEDIUM'],
    dueDate: [null],
    storyPoints: [null],
    description: ['']
  });

  onSubmit() {
    if (this.form.invalid || !this.projectId) return;
    this.saving.set(true);
    const val = this.form.value;
    const payload = {
      title: val.title!,
      taskType: val.taskType || 'TASK',
      priority: val.priority || 'MEDIUM',
      dueDate: val.dueDate ? (val.dueDate as Date).toISOString().split('T')[0] : undefined,
      storyPoints: val.storyPoints || undefined,
      description: val.description || undefined
    };
    this.taskSvc.create(this.projectId, payload).subscribe({
      next: (t) => {
        this.taskCreated.emit(t);
        this.form.reset({ taskType: 'TASK', priority: 'MEDIUM' });
        this.saving.set(false);
        this.visibleChange.emit(false);
      },
      error: () => this.saving.set(false)
    });
  }

  onCancel() {
    this.visibleChange.emit(false);
    this.form.reset({ taskType: 'TASK', priority: 'MEDIUM' });
  }
}
