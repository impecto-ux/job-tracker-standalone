
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TickerConfig } from './entities/ticker-config.entity';
import { CreateTickerDto } from './dto/create-ticker.dto';
import { UpdateTickerDto } from './dto/update-ticker.dto';

@Injectable()
export class TickerService {
    constructor(
        @InjectRepository(TickerConfig)
        private tickerRepository: Repository<TickerConfig>,
    ) { }

    create(createTickerDto: CreateTickerDto) {
        const ticker = this.tickerRepository.create(createTickerDto);
        return this.tickerRepository.save(ticker);
    }

    findAll() {
        return this.tickerRepository.find({
            order: { order: 'ASC' }
        });
    }

    findActive() {
        return this.tickerRepository.find({
            where: { isActive: true },
            order: { order: 'ASC' }
        });
    }

    findOne(id: number) {
        return this.tickerRepository.findOneBy({ id });
    }

    async update(id: number, updateTickerDto: UpdateTickerDto) {
        await this.tickerRepository.update(id, updateTickerDto);
        return this.tickerRepository.findOneBy({ id });
    }

    remove(id: number) {
        return this.tickerRepository.delete(id);
    }
}
