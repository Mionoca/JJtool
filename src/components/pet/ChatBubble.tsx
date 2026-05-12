interface Props {
  message: string;
}

export default function ChatBubble({ message }: Props) {
  return (
    <div className="animate-bubble-appear">
      <div className="glass rounded-bubble px-4 py-3 shadow-bubble relative">
        {/* Speech text */}
        <p className="text-sm text-fluent-text leading-relaxed">{message}</p>

        {/* Triangle pointer pointing down */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div className="w-4 h-4 glass rotate-45 -mt-2 border-t-0 border-l-0" />
        </div>
      </div>
    </div>
  );
}
