
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TickerService } from './ticker.service';
import { CreateTickerDto } from './dto/create-ticker.dto';
import { UpdateTickerDto } from './dto/update-ticker.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ticker')
export class TickerController {
    constructor(private readonly tickerService: TickerService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createTickerDto: CreateTickerDto) {
        return this.tickerService.create(createTickerDto);
    }

    @Get()
    findAll() {
        return this.tickerService.findAll();
    }

    @Get('active')
    @UseGuards(JwtAuthGuard)
    findActive(@Request() req) {
        // Future: Filter by role if needed
        return this.tickerService.findActive();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tickerService.findOne(+id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateTickerDto: UpdateTickerDto) {
        return this.tickerService.update(+id, updateTickerDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.tickerService.remove(+id);
    }
}
