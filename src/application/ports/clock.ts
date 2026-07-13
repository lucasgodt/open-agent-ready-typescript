/** Port for time, so "now" is injectable and tests never sleep. */
export interface Clock {
  now(): Date;
}
