import { type Dimension, type Player, type Vector3, system, world } from '@minecraft/server';

const CRUSTBREAKER_PICKAXE = 'dadmodz:crustbreaker_pickaxe';

const CRACK_LENGTH = 25;
const MAX_DRIFT = 3;
const DRIFT_CHANCE = 0.4;
const BRANCH_CHANCE = 0.15;
const BRANCH_MIN_LENGTH = 2;
const BRANCH_MAX_LENGTH = 4;
const MAX_SURFACE_DELTA = 2;

const COUNTDOWN_SECONDS = 3;
const CASCADE_INTERVAL_TICKS = 2;
const EXPLOSION_RADIUS = 3;
const TICKS_PER_SECOND = 20;

const PROTECTED_BLOCKS = new Set([
	'minecraft:bedrock',
	'minecraft:barrier',
	'minecraft:command_block',
	'minecraft:chain_command_block',
	'minecraft:repeating_command_block',
	'minecraft:structure_block',
	'minecraft:jigsaw',
	'minecraft:end_portal',
	'minecraft:end_portal_frame'
]);

interface Step {
	x: number;
	z: number;
}

const activePlayers = new Set<string>();

world.afterEvents.playerBreakBlock.subscribe((event) => {
	const { player, block, dimension } = event;

	if (event.itemStackBeforeBreak?.typeId !== CRUSTBREAKER_PICKAXE) {
		return;
	}

	// Only strikes at the ground under the player's feet start a crack.
	if (block.location.y > Math.floor(player.location.y) || activePlayers.has(player.id)) {
		return;
	}

	const forward = getHorizontalDirection(player.getViewDirection());
	const path = createCrack({ x: block.location.x, z: block.location.z }, forward);
	const tntBlocks = placeTnt(dimension, path, block.location.y);

	if (tntBlocks.length === 0) {
		return;
	}

	startCountdown(player, dimension, tntBlocks);
});

function getHorizontalDirection(view: Vector3): Step {
	if (Math.abs(view.x) > Math.abs(view.z)) {
		return { x: view.x >= 0 ? 1 : -1, z: 0 };
	}

	return { x: 0, z: view.z >= 0 ? 1 : -1 };
}

function randomInt(min: number, max: number): number {
	return min + Math.floor(Math.random() * (max - min + 1));
}

// Builds a zigzag line of columns with small side branches, ordered from the
// player outward so the blasts travel as a wave.
function createCrack(origin: Step, forward: Step): Step[] {
	const side: Step = { x: forward.z, z: forward.x };
	const cells = new Map<string, Step>();
	const along = (cell: Step) => (cell.x - origin.x) * forward.x + (cell.z - origin.z) * forward.z;
	const add = (cell: Step) => cells.set(`${cell.x},${cell.z}`, cell);
	const at = (forwardOffset: number, sideOffset: number): Step => ({
		x: origin.x + forward.x * forwardOffset + side.x * sideOffset,
		z: origin.z + forward.z * forwardOffset + side.z * sideOffset
	});

	let drift = 0;
	add(at(0, 0));

	for (let step = 1; step < CRACK_LENGTH; step++) {
		if (Math.random() < DRIFT_CHANCE) {
			const nextDrift = Math.max(
				-MAX_DRIFT,
				Math.min(MAX_DRIFT, drift + (Math.random() < 0.5 ? -1 : 1))
			);

			// Fill the corner so the crack stays connected.
			if (nextDrift !== drift) {
				add(at(step, drift));
				drift = nextDrift;
			}
		}

		add(at(step, drift));

		if (step > 2 && Math.random() < BRANCH_CHANCE) {
			const direction = Math.random() < 0.5 ? -1 : 1;
			const length = randomInt(BRANCH_MIN_LENGTH, BRANCH_MAX_LENGTH);
			let branchSide = drift;
			let branchForward = step;

			for (let i = 0; i < length; i++) {
				branchSide += direction;
				add(at(branchForward, branchSide));

				// Branches angle forward on every other step.
				if (i % 2 === 1) {
					branchForward++;
					add(at(branchForward, branchSide));
				}
			}
		}
	}

	return [...cells.values()].sort((a, b) => along(a) - along(b));
}

function placeTnt(dimension: Dimension, path: Step[], originY: number): Vector3[] {
	const placed: Vector3[] = [];

	for (const cell of path) {
		try {
			const top = dimension.getTopmostBlock({ x: cell.x, z: cell.z });

			if (
				top === undefined ||
				top.isAir ||
				top.isLiquid ||
				PROTECTED_BLOCKS.has(top.typeId) ||
				Math.abs(top.location.y - originY) > MAX_SURFACE_DELTA
			) {
				continue;
			}

			top.setType('minecraft:tnt');
			placed.push(top.location);
		} catch {
			// Column is in an unloaded chunk or outside the world; skip it.
		}
	}

	return placed;
}

function startCountdown(player: Player, dimension: Dimension, tntBlocks: Vector3[]): void {
	activePlayers.add(player.id);

	// The blasts begin right next to the player; keep them from being hurt.
	const cascadeTicks = tntBlocks.length * CASCADE_INTERVAL_TICKS;
	player.addEffect('resistance', COUNTDOWN_SECONDS * TICKS_PER_SECOND + cascadeTicks + 40, {
		amplifier: 4,
		showParticles: false
	});

	for (let second = 0; second < COUNTDOWN_SECONDS; second++) {
		system.runTimeout(() => {
			if (!player.isValid) {
				return;
			}

			// Subtitle text is drawn at half the title size; gray plus a fade-out
			// is the closest the Script API gets to a see-through countdown.
			player.onScreenDisplay.setTitle(' ', {
				subtitle: `§7DETONATION IN ${COUNTDOWN_SECONDS - second}`,
				fadeInDuration: 0,
				stayDuration: TICKS_PER_SECOND / 2,
				fadeOutDuration: TICKS_PER_SECOND / 2
			});
			player.playSound('random.click');
		}, second * TICKS_PER_SECOND);
	}

	tntBlocks.forEach((location, index) => {
		system.runTimeout(
			() => detonate(dimension, location),
			COUNTDOWN_SECONDS * TICKS_PER_SECOND + index * CASCADE_INTERVAL_TICKS
		);
	});

	system.runTimeout(
		() => activePlayers.delete(player.id),
		COUNTDOWN_SECONDS * TICKS_PER_SECOND + cascadeTicks
	);
}

function detonate(dimension: Dimension, location: Vector3): void {
	try {
		const center = { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 };

		dimension.getBlock(location)?.setType('minecraft:air');
		dimension.createExplosion(center, EXPLOSION_RADIUS, { breaksBlocks: true });
	} catch {
		// Chunk unloaded before its turn; skip this blast.
	}
}
