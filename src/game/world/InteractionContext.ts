import { Coordinate } from "../../core/Coordinate";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Interaction, InteractionEvent } from "../../core/Interaction";

/**
 * An InteractionContext is a simple event handler object to statefully
 * andle interaction events.
 *
 * @see InteractionEvent
 * @see Interaction
 */
export interface InteractionContext {
  /**
   * Event handler triggered when a coordinate is selected
   *
   * @param coord the selected coordinate
   * @see Interaction
   */
  select(coord: Coordinate): void;

  /**
   * Event handler triggered when a new coordinate is hovered
   *
   * @param coord the hovered coordinate
   * @see Interaction
   */
  hover(coord: Coordinate): void;

  /**
   * Perform cleanup
   */
  close(): void;
}
