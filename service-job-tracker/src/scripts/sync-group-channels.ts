import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { GroupsService } from '../groups/groups.service';
import { ChannelsService } from '../channels/channels.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const groupsService = app.get(GroupsService);
    const channelsService = app.get(ChannelsService);

    console.log('Starting Group-Channel Name Sync...');

    const allGroups = await groupsService.findAll({ userRole: 'admin' });
    console.log(`Found ${allGroups.length} groups.`);

    for (const group of allGroups) {
        console.log(`Checking Group ID: ${group.id} | Name: "${group.name}" | ChannelID: ${group.channelId}`);
        if (!group.channelId) {
            console.log(`- Skipping (No channelId)`);
            continue;
        }

        const channel = await channelsService.findOneBy({ id: group.channelId });
        if (!channel) {
            console.error(`- ERROR: Channel ${group.channelId} not found.`);
            continue;
        }

        console.log(`- Linked Channel: "${channel.name}"`);

        if (group.name !== channel.name) {
            console.log(`  MISMATCH FOUND: Fixing...`);
            await channelsService.updateChannel(channel.id, group.name);
            console.log(`  ✅ Synced.`);
        } else {
            console.log(`  ✓ Match.`);
        }
    }

    console.log('Sync complete.');
    await app.close();
}

bootstrap();
