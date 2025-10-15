class Clock {
  static getDate(date?: string) {
    const dateObj = date ? new Date(date) : new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata", // ensures IST always
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dateObj);
  }

  /**
   * @returns date in format specified
   */
  static getDateInFormat(date?: string, options?: Intl.DateTimeFormatOptions) {
    const dateObj = date ? new Date(date) : new Date();
    const formatter = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...options,
    });
    return formatter.format(dateObj);
  }
  /**
   * @returns date time in format specified
   */
  static getDateTimeInFormat(
    date?: string,
    options?: Intl.DateTimeFormatOptions
  ) {
    const dateObj = date ? new Date(date) : new Date();
    const formatter = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // 12-hour format with AM/PM
    });
    return formatter.format(dateObj);
  }

  static getTimeInFormat(
    time: number
  ) {
    const dateObj = time ? new Date(time) : new Date();
    const formatter = new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return formatter.format(dateObj);
  }

  static getTimeDifference(
    startDate: Date | string | number,
    endDate: Date | string | number,
  ): number {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return end - start;
  }

  static getTimeDiffInFormat(
    startDate: Date | string | number,
    endDate: Date | string | number
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    // Handle invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "Invalid date";
    }
  
    let diffInSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (diffInSeconds < 0) diffInSeconds = 0;
  
    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;
  
    const pad = (num: number) => String(num).padStart(2, "0");
  
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
}

export default Clock;
