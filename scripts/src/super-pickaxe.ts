import { BlockVolume, type Vector3, world } from '@minecraft/server';

const SUPER_PICKAXE = 'dadmodz:super_pickaxe';

const TUNNEL_LENGTH = 100;
const TUNNEL_RADIUS = 1;

const PROTECTED_BLOCKS = [
	'minecraft:bedrock',
	'minecraft:barrier',
	'minecraft:command_block',
	'minecraft:chain_command_block',
	'minecraft:repeating_command_block',
	'minecraft:structure_block',
	'minecraft:jigsaw',
	'minecraft:end_portal',
	'minecraft:end_portal_frame'
];

world.afterEvents.playerBreakBlock.subscribe((event) => {
	const item = event.itemStackBeforeBreak;

	if (item?.typeId !== SUPER_PICKAXE) {
		return;
	}

	const direction = getMiningDirection(event.player.getViewDirection());
	const origin = event.block.location;

	const volume = createTunnel(origin, direction);

	event.player.dimension.fillBlocks(volume, 'minecraft:air', {
		blockFilter: {
			excludeTypes: PROTECTED_BLOCKS
		},
		ignoreChunkBoundErrors: true
	});
});

function getMiningDirection(view: Vector3): Vector3 {
	const x = Math.abs(view.x);
	const y = Math.abs(view.y);
	const z = Math.abs(view.z);

	if (y > x && y > z) {
		return {
			x: 0,
			y: view.y >= 0 ? 1 : -1,
			z: 0
		};
	}

	if (x > z) {
		return {
			x: view.x >= 0 ? 1 : -1,
			y: 0,
			z: 0
		};
	}

	return {
		x: 0,
		y: 0,
		z: view.z >= 0 ? 1 : -1
	};
}

function createTunnel(origin: Vector3, direction: Vector3): BlockVolume {
	const end: Vector3 = {
		x: origin.x + direction.x * (TUNNEL_LENGTH - 1),
		y: origin.y + direction.y * (TUNNEL_LENGTH - 1),
		z: origin.z + direction.z * (TUNNEL_LENGTH - 1)
	};

	// Tunnel along X
	if (direction.x !== 0) {
		return new BlockVolume(
			{
				x: Math.min(origin.x, end.x),
				y: origin.y - TUNNEL_RADIUS,
				z: origin.z - TUNNEL_RADIUS
			},
			{
				x: Math.max(origin.x, end.x),
				y: origin.y + TUNNEL_RADIUS,
				z: origin.z + TUNNEL_RADIUS
			}
		);
	}

	// Tunnel vertically
	if (direction.y !== 0) {
		return new BlockVolume(
			{
				x: origin.x - TUNNEL_RADIUS,
				y: Math.min(origin.y, end.y),
				z: origin.z - TUNNEL_RADIUS
			},
			{
				x: origin.x + TUNNEL_RADIUS,
				y: Math.max(origin.y, end.y),
				z: origin.z + TUNNEL_RADIUS
			}
		);
	}

	// Tunnel along Z
	return new BlockVolume(
		{
			x: origin.x - TUNNEL_RADIUS,
			y: origin.y - TUNNEL_RADIUS,
			z: Math.min(origin.z, end.z)
		},
		{
			x: origin.x + TUNNEL_RADIUS,
			y: origin.y + TUNNEL_RADIUS,
			z: Math.max(origin.z, end.z)
		}
	);
}
