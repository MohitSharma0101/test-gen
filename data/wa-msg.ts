export const WA_MSG = {
  absent: (name: string, date: string, batch: string) => `Dear Parent,
We wish to inform you that your ward, *${name}*, was marked *absent* on _${date}_ in batch *${batch}*.  

Kindly ensure regular attendance for better learning and continuity in studies.

Regards,
Team Education+`,
  extraClass: (name: string, date: string) => `Dear Parent,  
We wish to inform you that your ward, *${name}*, will be staying late on _${date}_ due to an extra class.  

Kindly make necessary arrangements for pickup accordingly.  

Regards,  
Team Education+`,
};
