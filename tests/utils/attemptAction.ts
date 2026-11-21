/**
 * Tries an action until it succeeds, and fails when its last attempt fails.
 *
 * @param action  The action function to attempt
 * @param attempts  The number of attempts to try the action
 * @param delay delay between attempts
 * @returns True if the action is successful, otherwise throws an error that
 *   has the error of the last attempt as its cause
 */

export const attemptAction = async (action: () => Promise<void>, attempts = 10, delay = 100) => {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await action();
      return true;
    } catch (error) {
      if (attempt === attempts) {
        throw new Error(`Action failed after ${attempts} attempts.`, { cause: error });
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
