export const DropHereText = ({ text, show }: { text: string; show: boolean }) => {
  return (
    <div className={`drop-here-text ${!show ? 'disabled' : ''}`}>
      <p>{text}</p>
    </div>
  );
};
