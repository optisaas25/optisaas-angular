import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupeDto } from './dto/create-groupe.dto';
import { UpdateGroupeDto } from './dto/update-groupe.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Roles('admin')
  @Post()
  create(@Body(ValidationPipe) createGroupeDto: CreateGroupeDto) {
    return this.groupsService.create(createGroupeDto);
  }

  @Get()
  findAll(@Query('type') type?: string) {
    return this.groupsService.findAll(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateGroupeDto: UpdateGroupeDto,
  ) {
    return this.groupsService.update(id, updateGroupeDto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }
}
