import type { IViewportOperations } from './IViewportOperations';
import { nextViewportOperations } from './NextViewportOperations';

/**
 * The operations on a viewport that the commands use. commandsModule (and any
 * other caller) imports this and calls e.g. `viewportOperations.flipHorizontal(viewport)`,
 * which keeps the interaction logic out of the command bodies. Stateless and
 * dependency-free (each op takes an already-resolved viewport), so it is a plain
 * singleton rather than a registered service.
 */
export const viewportOperations: IViewportOperations = nextViewportOperations;
