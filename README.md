# BoxFrame

**DataFrames for JavaScript** - A high-performance data analysis library with WebAssembly acceleration. Inspired by Pandas.

**Cross-Platform**: Works in Deno, Node.js, Bun, and browsers

## Quick Start

```typescript
import { DataFrame } from "@cross/boxframe";

const df = new DataFrame({
    name: ["Alice", "Bob", "Charlie"],
    age: [25, 30, 35],
    salary: [50000, 60000, 70000],
});

// Find high earners
const highEarners = df.query("salary > 55000");
console.log(highEarners.toString());
```

## Installation

```bash
# Deno
deno add jsr:@cross/boxframe

# Node.js
npx jsr add @cross/boxframe

# Bun
bunx jsr add @cross/boxframe
```

### Browser

```html
<script type="module">
    import { DataFrame } from "https://esm.sh/jsr/@cross/boxframe@0.0.1";
    // Use DataFrame in your browser app
</script>
```

**Try it live:** [JSFiddle Demo](https://jsfiddle.net/pinta365/e9L8ynmr/)

## Documentation

📚 **[Complete Documentation](https://boxframe.pinta.land)** - API reference, examples, and guides

## License

MIT License - see [LICENSE](LICENSE) file for details.
