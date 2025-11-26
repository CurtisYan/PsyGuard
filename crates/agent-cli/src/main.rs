//! Psy Wallet Agent CLI

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "psy-agent")]
#[command(about = "Psy Wallet Agent CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// 检查 EVM 余额
    Balance {
        /// 地址
        #[arg(short, long)]
        address: String,
    },
    /// 获取价格
    Price {
        /// 代币符号
        #[arg(short, long)]
        symbol: String,
    },
    /// 开始 UPS 会话
    SessionStart,
    /// 添加交易
    SessionAdd,
    /// 结束会话
    SessionEnd,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Balance { address } => {
            println!("🔍 查询余额: {}", address);
            // TODO: 实现
        }
        Commands::Price { symbol } => {
            println!("💰 查询价格: {}", symbol);
            // TODO: 实现
        }
        Commands::SessionStart => {
            println!("🚀 开始 UPS 会话");
            // TODO: 实现
        }
        Commands::SessionAdd => {
            println!("➕ 添加交易");
            // TODO: 实现
        }
        Commands::SessionEnd => {
            println!("✅ 结束会话");
            // TODO: 实现
        }
    }

    Ok(())
}
