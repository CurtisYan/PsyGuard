//! Realm 接收端
//! 
//! 演示用的 End Cap 接收 API

pub mod api;
pub mod metrics;
pub mod store;

pub use api::{AppState, health, ingest, metrics as get_metrics};
pub use metrics::{build_guta_tree, GutaLayer, GutaTree, RealmMetrics};
pub use store::{EndCapRecord, RealmStore};

pub use api::*;
pub use metrics::*;
