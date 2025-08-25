import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import useStdoutDimensions from 'ink-use-stdout-dimensions';

interface EditorProps {
  initialValue?: string;
  onSubmit: (value: string) => void;
}

const MarkdownEditor: React.FC<EditorProps> = ({initialValue = '', onSubmit}) => {
  const [columns, rows] = useStdoutDimensions();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    console.clear();
  }, []);

  useInput((input, key) => {
    if (key.ctrl && input === 's') {
      onSubmit(value);
    } else if (key.return) {
      setValue((prev) => prev + '\n');
    } else if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1));
    } else {
      setValue((prev) => prev + input);
    }
  });

  const lines = value.split('\n');

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box flexDirection="column" flexGrow={1}>
        {lines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Text color="gray">Press Ctrl+S to save</Text>
    </Box>
  );
};

export {MarkdownEditor};
