// Run exported campaign bytecode through the engine with a host hardware stub.
// Collision paths are checked separately; these placements exercise interaction
// and trigger entry without relying on a particular frame rate.
#include <assert.h>
#include <stdio.h>
#include "test_engine_stubs.h"
#include "engine.c"

static void tick(unsigned keys) { test_set_keys(keys); engine_update(); }
static void idle(void) { for (int i=0;i<4;i++) tick(0); }
static void tap(unsigned key) { tick(0);tick(key);tick(0);idle(); }
static void dialogue(void) {
  for (int i=0;i<24;i++) {
    idle();
    if (!textbox_is_open()) return;
    tap(KEY_A);
  }
  assert(!"Dialogue failed to close");
}
static void at(unsigned x, unsigned y) {
  unsigned scale=current_scene.type==SCENE_TYPE_ISOMETRIC ? 1 : 8;
  vm_actor_set_position(0,x*scale,y*scale); idle();
}
static void interact(unsigned x,unsigned y) { at(x,y);tap(KEY_A);dialogue(); }
static void enter(unsigned x,unsigned y) { at(x,y);dialogue(); }

int main(void) {
  setvbuf(stdout,NULL,_IONBF,0);
  test_reset_environment(); engine_init(); idle();
  assert(gba_game_data.scene_count==4);
  assert(current_scene_index==0 && VM_ISLOCKED());
  tap(KEY_A);assert(current_scene_index==0);
  tap(KEY_START);dialogue();assert(current_scene_index==1);
  tap(KEY_START);assert(current_scene_index==1);
#ifdef SUNSTONE
  enter(6,5);assert(current_scene_index==1 && vm_variables[0]==0);
  interact(4,4);assert(vm_variables[0]==1);
  enter(6,5);assert(current_scene_index==2);
  enter(6,5);assert(current_scene_index==2);
  enter(1,2);assert(vm_variables[1]==1);
  at(2,2);enter(1,2);assert(vm_variables[1]==1);
  enter(1,5);assert(current_scene_index==1);
  enter(6,5);assert(current_scene_index==2 && vm_variables[1]==1);
  enter(6,3);assert(vm_variables[1]==2);
  enter(6,5);assert(current_scene_index==3);
  interact(4,5);assert(vm_variables[5]==0);
  interact(3,3);assert(vm_variables[4]==1);
  interact(4,5);assert(vm_variables[5]==1 && VM_ISLOCKED());
#else
  enter(5,18);assert(current_scene_index==1 && vm_variables[0]==0);
  interact(15,18);assert(vm_variables[0]==1);
  enter(5,18);assert(current_scene_index==2);
  interact(14,11);assert(vm_variables[11]==0);
  enter(14,3);assert(current_scene_index==2);
  interact(8,16);interact(8,16);assert(vm_variables[1]==1);
  enter(14,18);assert(current_scene_index==1);
  enter(5,18);assert(current_scene_index==2 && vm_variables[1]==1);
  interact(23,16);assert(vm_variables[1]==2);
  interact(14,11);assert(vm_variables[11]==1);
  enter(14,3);assert(current_scene_index==3);
  interact(18,11);assert(vm_variables[3]==0);
  interact(14,16);assert(vm_variables[4]==0);
  interact(14,9);assert(vm_variables[12]==1);
  interact(18,11);assert(vm_variables[3]==1);
  interact(14,16);assert(vm_variables[4]==1 && vm_variables[14]==100 && VM_ISLOCKED());
#endif
  tap(KEY_START);idle();assert(current_scene_index==0 && VM_ISLOCKED());
  for(int i=0;i<6;i++) assert(vm_variables[i]==0);
  tap(KEY_START);dialogue();assert(current_scene_index==1);
  puts("Compiled campaign: title, objective gates, return visits, ending and replay passed.");
  return 0;
}
