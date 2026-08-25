import eslint from '@eslint/js'
import minecraftLinting from 'eslint-plugin-minecraft-linting'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: ['dist/', 'node_modules/', 'packs/**/scripts/']
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['scripts/src/**/*.ts'],
		plugins: {
			'minecraft-linting': minecraftLinting
		},
		rules: {
			'minecraft-linting/avoid-unnecessary-command': 'warn'
		}
	}
)
