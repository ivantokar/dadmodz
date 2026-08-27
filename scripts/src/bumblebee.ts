import { world } from '@minecraft/server';

const BUMBLEBEE_TYPE = 'dadmodz:bumblebee';

const POISON_DURATION_TICKS = 100; // 5 seconds
const POISON_AMPLIFIER = 0; // Poison I

world.afterEvents.entityHitEntity.subscribe((event) => {
	const { damagingEntity, hitEntity } = event;

	if (damagingEntity.typeId !== BUMBLEBEE_TYPE) {
		return;
	}

	try {
		hitEntity.addEffect('poison', POISON_DURATION_TICKS, {
			amplifier: POISON_AMPLIFIER,
			showParticles: true
		});
	} catch {
		// Some entities may not accept the effect.
	}
});
