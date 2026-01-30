
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickerService } from './ticker.service';
import { TickerController } from './ticker.controller';
import { TickerConfig } from './entities/ticker-config.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TickerConfig])],
    controllers: [TickerController],
    providers: [TickerService],
    exports: [TickerService],
})
export class TickerModule { }
