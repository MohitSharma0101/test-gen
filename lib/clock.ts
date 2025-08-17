class Clock {
  static getDate(date?: string) {
    const dateObj = date ? new Date(date) : new Date();
    return dateObj.toISOString().split("T")[0];
  }
}

export default Clock;
