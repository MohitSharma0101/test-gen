type Props = {
  label: string;
  value: string;
};

const LabelValue = ({ label, value }: Props) => {
  return (
    <div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className="text-sm text-slate-950 font-semibold">{value}</div>
    </div>
  );
};

export default LabelValue;
