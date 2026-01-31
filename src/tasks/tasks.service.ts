import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateTaskDto, UpdateTaskDto, TaskStatus } from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async create(createTaskDto: CreateTaskDto) {
    const { member_id, title, description, status, priority, due_date } = createTaskDto;

    // Check if member exists
    const { data: member, error: memberError } = await this.supabase
      .from('members')
      .select('user_id')
      .eq('user_id', member_id)
      .single();

    if (memberError || !member) {
      throw new NotFoundException(`Member with ID ${member_id} not found`);
    }

    // Create the task
    const { data: task, error: taskError } = await this.supabase
      .from('tasks')
      .insert({
        member_id,
        title,
        description,
        status: status || TaskStatus.TODO,
        priority: priority || 'MEDIUM',
        due_date,
      })
      .select()
      .single();

    if (taskError) {
      throw new BadRequestException(`Failed to create task: ${taskError.message}`);
    }

    return task;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch tasks: ${error.message}`);
    }

    return data || [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return data;
  }

  async findByMemberId(memberId: string) {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch tasks for member: ${error.message}`);
    }

    return data || [];
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    // Check if task exists
    const { data: existingTask, error: findError } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // If status is being updated to COMPLETED, set completed_at
    const updateData: any = { ...updateTaskDto };
    if (updateTaskDto.status === TaskStatus.COMPLETED && !updateTaskDto.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    // Update the task
    const { data: task, error: updateError } = await this.supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new BadRequestException(`Failed to update task: ${updateError.message}`);
    }

    return task;
  }

  async remove(id: string) {
    // Check if task exists
    const { data: existingTask, error: findError } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Delete the task
    const { error: deleteError } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new BadRequestException(`Failed to delete task: ${deleteError.message}`);
    }

    return { message: 'Task deleted successfully' };
  }

  async getTaskStatsByMember(memberId: string) {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('status')
      .eq('member_id', memberId);

    if (error) {
      throw new BadRequestException(`Failed to fetch task stats: ${error.message}`);
    }

    const stats = {
      total: data.length,
      todo: data.filter(t => t.status === TaskStatus.TODO).length,
      in_progress: data.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: data.filter(t => t.status === TaskStatus.COMPLETED).length,
      cancelled: data.filter(t => t.status === TaskStatus.CANCELLED).length,
    };

    return stats;
  }
}
