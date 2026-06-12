
/**
 * Calculates the number of working minutes between two dates.
 * Working hours: 06:00 to 16:00 (10 hours per day).
 */
export function calculateWorkingMinutes(startDate: Date, endDate: Date): number {
    if (endDate <= startDate) return 0;

    let totalMinutes = 0;
    const current = new Date(startDate);
    
    // Normalize to minute precision
    current.setSeconds(0, 0);
    const end = new Date(endDate);
    end.setSeconds(0, 0);

    const WORK_START_HOUR = 6;
    const WORK_END_HOUR = 16;

    while (current < end) {
        const hour = current.getHours();
        
        // Check if current time is within working hours
        if (hour >= WORK_START_HOUR && hour < WORK_END_HOUR) {
            totalMinutes++;
        }
        
        // Move to next minute
        current.setMinutes(current.getMinutes() + 1);
        
        // Optimization: If current is before today's 6 AM, skip to 6 AM
        if (current.getHours() < WORK_START_HOUR) {
            current.setHours(WORK_START_HOUR, 0, 0, 0);
        }
        // If current is after today's 4 PM, skip to tomorrow's 6 AM
        else if (current.getHours() >= WORK_END_HOUR) {
            current.setDate(current.getDate() + 1);
            current.setHours(WORK_START_HOUR, 0, 0, 0);
        }
    }

    return totalMinutes;
}
